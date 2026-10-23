from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:5173"
DESKTOP = {"width": 1440, "height": 900}
PHONE = {"width": 375, "height": 812}
LIGHT_BG = (249, 248, 246)  # hsl(40 20% 97%)
DARK_BG = (25, 23, 21)  # hsl(30 7% 9%)
LIGHT_TEXT = (36, 33, 30)  # hsl(30 8% 13%)
DARK_TEXT = (233, 231, 226)  # hsl(40 14% 90%)
TEXT_SWAP_MS = 140  # .theme-switching in src/index.css
BODY_BOX_RATIO = 100 / 44  # src/components/sky/skyMotion.js
GHOST_OPACITY = "0.12"  # src/index.css, the contrast budget

# Fastest legitimate motion, from the motion contract (skyMotion.js): the rise
# curve cubic-bezier(0.16, 1, 0.3, 1) starts at slope 1 / 0.16 over 0.9 s, and a
# quadratic arc leaves its start at twice the 1.25-diameter control distance.
RISE_START_SLOPE = 1 / 0.16
RISE_SECONDS = 0.9
MAX_SPEED_DIAMETERS = 2 * 1.25 * RISE_START_SLOPE / RISE_SECONDS
MAX_OPACITY_RATE = RISE_START_SLOPE / RISE_SECONDS
HEADROOM = 1.3


def create_page(browser, viewport=DESKTOP, **context_options):
    context = browser.new_context(viewport=viewport, **context_options)
    page = context.new_page()
    errors = []
    page.on(
        "console",
        lambda message: errors.append(message.text)
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("[data-sky-scene][data-sky-theme]")
    return context, page, errors


def settle_entrance(page):
    # Rise (150 ms delay + 900 ms) and weather (300 ms delay + 1200 ms).
    page.wait_for_timeout(1_700)


def parse_rgb(value):
    inner = value[value.index("(") + 1 : value.index(")")]
    return tuple(round(float(part)) for part in inner.replace(",", " ").split()[:3])


def record_switches(page, click_at_ms, duration_ms=1_900):
    """Clicks the theme toggle at the given times and samples every frame."""
    return page.evaluate(
        """({ clickAt, durationMs }) => new Promise((resolve) => {
            const sky = document.querySelector('[data-sky-scene]');
            const bodies = {
                sun: sky.querySelector('[data-sky-body="sun"]'),
                moon: sky.querySelector('[data-sky-body="moon"]'),
            };
            const toggle = () => document
                .querySelector('button[aria-label^="Switch to"]')
                .click();
            const read = (el) => {
                const style = getComputedStyle(el);
                const matrix = new DOMMatrixReadOnly(
                    style.transform === 'none' ? undefined : style.transform
                );
                return { opacity: parseFloat(style.opacity), x: matrix.e, y: matrix.f };
            };
            const pending = [...clickAt];
            const samples = [];
            let start = null;
            const frame = (now) => {
                if (start === null) start = now;
                const t = now - start;
                while (pending.length && t >= pending[0]) {
                    pending.shift();
                    toggle();
                }
                samples.push({
                    t,
                    sun: read(bodies.sun),
                    moon: read(bodies.moon),
                    bg: getComputedStyle(document.body).backgroundColor,
                    text: getComputedStyle(document.querySelector('h1')).color,
                    dark: document.documentElement.classList.contains('dark'),
                    switching: document.documentElement.classList
                        .contains('theme-switching'),
                });
                if (t < durationMs) requestAnimationFrame(frame);
                else resolve({
                    samples,
                    diameter: bodies.sun.offsetWidth / (100 / 44),
                });
            };
            requestAnimationFrame(frame);
        })""",
        {"clickAt": click_at_ms, "durationMs": duration_ms},
    )


def samples_between(capture, start_ms, end_ms):
    return [s for s in capture["samples"] if start_ms <= s["t"] < end_ms]


def assert_no_jumps(capture):
    """No body moves or fades faster than the motion contract allows.

    Measured as speed, not per-sample distance, so a slow headless frame rate
    does not read as a jump while a real teleport still does.
    """
    max_speed = MAX_SPEED_DIAMETERS * capture["diameter"] * HEADROOM
    max_fade = MAX_OPACITY_RATE * HEADROOM
    samples = capture["samples"]
    for previous, current in zip(samples, samples[1:]):
        seconds = (current["t"] - previous["t"]) / 1000
        if seconds <= 0:
            continue
        for name in ("sun", "moon"):
            a, b = previous[name], current[name]
            fade = abs(b["opacity"] - a["opacity"])
            assert fade <= max_fade * seconds + 0.02, (name, fade, previous, current)
            distance = ((b["x"] - a["x"]) ** 2 + (b["y"] - a["y"]) ** 2) ** 0.5
            assert distance <= max_speed * seconds + 1, (name, distance, previous, current)


def run_removed_content_check(browser):
    context, page, errors = create_page(browser)
    assert page.locator("[data-scroll-figure]").count() == 0
    contact = page.locator("#contact")
    assert "Phone" not in contact.inner_text()
    assert page.locator('a[href^="tel:"]').count() == 0
    assert contact.locator(".group").count() == 2
    assert not errors, errors
    context.close()


def run_initial_scene_check(browser, scheme, visible, hidden):
    context, page, errors = create_page(browser, color_scheme=scheme)
    settle_entrance(page)
    sky = page.locator("[data-sky-scene]")
    assert sky.get_attribute("data-sky-theme") == scheme
    assert sky.get_attribute("data-sky-motion") == "running"
    assert sky.locator("canvas").count() == 1
    opacity = lambda name: float(
        page.locator(f'[data-sky-body="{name}"]').evaluate(
            "el => getComputedStyle(el).opacity"
        )
    )
    assert opacity(visible) > 0.98, opacity(visible)
    assert opacity(hidden) < 0.02, opacity(hidden)
    assert not errors, errors
    context.close()


def run_choreography_check(browser):
    context, page, errors = create_page(browser, color_scheme="dark")
    settle_entrance(page)
    capture = record_switches(page, [0])
    samples = capture["samples"]
    final = samples[-1]

    assert not final["dark"]
    assert page.evaluate("localStorage.getItem('theme')") == "light"

    # Page colours: mid-fade early on, finished inside the 500 ms UI band.
    mid = parse_rgb(samples_between(capture, 150, 250)[0]["bg"])
    assert DARK_BG[0] < mid[0] < LIGHT_BG[0], mid
    assert all(parse_rgb(s["bg"]) == LIGHT_BG for s in samples_between(capture, 500, 2_000))
    assert not samples_between(capture, 520, 2_000)[0]["switching"]

    # Text swaps once, never through in-between colours (no per-frame glyph repaint).
    texts = [parse_rgb(s["text"]) for s in samples]
    assert set(texts) <= {DARK_TEXT, LIGHT_TEXT}, set(texts)
    assert all(parse_rgb(s["text"]) == DARK_TEXT for s in samples_between(capture, 0, TEXT_SWAP_MS - 20))
    assert all(parse_rgb(s["text"]) == LIGHT_TEXT for s in samples_between(capture, TEXT_SWAP_MS + 60, 2_000))

    # Moon sets: only ever fades, gone by the end of its 600 ms exit.
    moon = [s["moon"]["opacity"] for s in samples]
    assert all(b <= a + 0.01 for a, b in zip(moon, moon[1:])), moon
    assert all(s["moon"]["opacity"] < 0.02 for s in samples_between(capture, 680, 2_000))

    # Sun rises: waits for its 150 ms delay, comes up from below, lands at rest.
    assert all(s["sun"]["opacity"] < 0.05 for s in samples_between(capture, 0, 120))
    first_visible = next(s for s in samples if s["sun"]["opacity"] > 0.05)
    assert first_visible["sun"]["y"] > capture["diameter"] * 0.5, first_visible
    assert all(s["sun"]["opacity"] > 0.98 for s in samples_between(capture, 1_150, 2_000))
    assert abs(final["sun"]["y"]) < 1 and abs(final["sun"]["x"]) < 1, final

    assert_no_jumps(capture)
    assert not errors, errors
    context.close()


def run_interrupt_check(browser):
    context, page, errors = create_page(browser, color_scheme="dark")
    settle_entrance(page)
    capture = record_switches(page, [0, 300])
    final = capture["samples"][-1]

    assert final["dark"]
    assert parse_rgb(final["bg"]) == DARK_BG
    assert final["moon"]["opacity"] > 0.98, final
    assert final["sun"]["opacity"] < 0.02, final
    assert abs(final["moon"]["y"]) < 1, final
    # The moon turned back before it had fully set.
    moon = [s["moon"]["opacity"] for s in capture["samples"]]
    assert min(moon) > 0.3, min(moon)
    assert_no_jumps(capture)
    assert not errors, errors
    context.close()


def run_reduced_motion_check(browser):
    context, page, errors = create_page(
        browser, color_scheme="dark", reduced_motion="reduce"
    )
    sky = page.locator("[data-sky-scene]")
    assert sky.get_attribute("data-sky-motion") == "reduced"
    capture = record_switches(page, [0], duration_ms=120)
    after_click = capture["samples"][1]
    assert not after_click["dark"]
    assert after_click["sun"]["opacity"] == 1, after_click
    assert after_click["moon"]["opacity"] == 0, after_click
    assert not any(s["switching"] for s in capture["samples"])
    halo = page.locator(".sky-halo").first.evaluate(
        "el => getComputedStyle(el).animationName"
    )
    assert halo == "none", halo
    assert not errors, errors
    context.close()


def run_pause_check(browser):
    context, page, errors = create_page(browser)
    pause = page.get_by_role("button", name="Pause background animation").first
    assert pause.get_attribute("aria-pressed") == "false"
    pause.click()
    sky = page.locator("[data-sky-scene]")
    assert pause.get_attribute("aria-pressed") == "true"
    assert sky.get_attribute("data-sky-motion") == "paused"
    assert page.evaluate("localStorage.getItem('background-motion')") == "paused"
    state = page.locator(".sky-halo").first.evaluate(
        "el => getComputedStyle(el).animationPlayState"
    )
    assert state == "paused", state

    page.reload()
    page.wait_for_selector("[data-sky-scene][data-sky-motion]")
    pause = page.get_by_role("button", name="Pause background animation").first
    assert pause.get_attribute("aria-pressed") == "true"
    assert page.locator("[data-sky-scene]").get_attribute("data-sky-motion") == "paused"

    pause.click()
    assert page.locator("[data-sky-scene]").get_attribute("data-sky-motion") == "running"
    assert page.evaluate("localStorage.getItem('background-motion')") is None
    assert not errors, errors
    context.close()


def run_contrast_budget_layout_check(browser):
    """Full-strength bodies only beside the content column; faint elsewhere."""
    for width, height in [(1440, 900), (1280, 800)]:
        context, page, errors = create_page(
            browser, viewport={"width": width, "height": height}, color_scheme="dark"
        )
        settle_entrance(page)
        geometry = page.evaluate(
            """() => {
                const moon = document.querySelector('[data-sky-body="moon"]');
                const rect = moon.getBoundingClientRect();
                const column = document.querySelector('#hero > div').getBoundingClientRect();
                return {
                    cap: getComputedStyle(moon.parentElement).opacity,
                    centre: rect.left + rect.width / 2,
                    width: moon.offsetWidth,
                    columnRight: column.right,
                };
            }"""
        )
        diameter = geometry["width"] / BODY_BOX_RATIO
        # Leftmost point the core reaches, including the far end of its rise path.
        reach = geometry["centre"] - diameter * (0.5 + 0.35)
        assert geometry["cap"] == "1", geometry
        assert reach >= geometry["columnRight"] + 15, (width, reach, geometry)
        assert not errors, errors
        context.close()

    for viewport in [{"width": 1279, "height": 800}, {"width": 768, "height": 1024}, PHONE]:
        context, page, errors = create_page(browser, viewport=viewport)
        caps = page.locator(".sky-body").evaluate_all(
            "els => els.map(el => getComputedStyle(el).opacity)"
        )
        assert caps == [GHOST_OPACITY, GHOST_OPACITY], (viewport, caps)
        assert not errors, errors
        context.close()


def run_touch_target_check(browser):
    context, page, errors = create_page(browser, viewport=PHONE, color_scheme="dark")
    for name in ["Pause background animation", "Switch to light theme"]:
        button = page.get_by_role("button", name=name).last
        box = button.bounding_box()
        for x, y in [
            (box["x"] - 3, box["y"] + box["height"] / 2),
            (box["x"] + box["width"] + 3, box["y"] + box["height"] / 2),
            (box["x"] + box["width"] / 2, box["y"] + box["height"] + 3),
        ]:
            hit = page.evaluate(
                """([x, y, label]) => document.elementFromPoint(x, y)
                    ?.closest('button')?.getAttribute('aria-label') === label""",
                [x, y, name],
            )
            assert hit, (name, x, y)
    assert not errors, errors
    context.close()


with sync_playwright() as playwright:
    chromium = playwright.chromium.launch(headless=True)
    run_removed_content_check(chromium)
    run_initial_scene_check(chromium, "dark", visible="moon", hidden="sun")
    run_initial_scene_check(chromium, "light", visible="sun", hidden="moon")
    run_choreography_check(chromium)
    run_interrupt_check(chromium)
    run_reduced_motion_check(chromium)
    run_pause_check(chromium)
    run_contrast_budget_layout_check(chromium)
    run_touch_target_check(chromium)
    chromium.close()

print("sky scene browser checks passed")
