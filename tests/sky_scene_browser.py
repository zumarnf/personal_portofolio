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

# Hero frog contract (src/components/sky/frogMotion.js).
FROG_LAYER = "[data-hero-frog]"
FROG_FEET = 50 / 56
FROG_MOUTH = (24, 37)
FROG_EYES = ((21, 24.5), (39, 24.5))
FROG_EYE_RADIUS = 7.6
FROG_TONGUE_REACH = 24
RAINDROP_CATCH = (4, 28)
ZONE_GAP, ZONE_FLOOR, ZONE_SPAN = 14, 16, 240
# Entrance at +1.0 s, 0.6 s long, then the longest wait before an action (9 s).
FROG_ACTION_WINDOW_MS = 11_000


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


def overlaps(a, b, slack=1):
    return (
        a["left"] < b["right"] - slack
        and b["left"] < a["right"] - slack
        and a["top"] < b["bottom"] - slack
        and b["top"] < a["bottom"] - slack
    )


def frog_geometry(page):
    return page.evaluate(
        """() => {
            const layer = document.querySelector('[data-hero-frog]');
            const rect = (el) => {
                const b = el.getBoundingClientRect();
                return { left: b.left, top: b.top, right: b.right, bottom: b.bottom,
                         width: b.width, height: b.height };
            };
            const fly = layer.querySelector('[data-critter="butterfly"]');
            const flyStyle = getComputedStyle(fly);
            return {
                frog: rect(layer.querySelector('[data-critter="frog"]')),
                fly: rect(fly),
                flyVisible: flyStyle.visibility === 'visible' && parseFloat(flyStyle.opacity) > 0.05,
                stats: rect(document.querySelector('#hero dl')),
                buttons: [...document.querySelectorAll('#hero a')].map(rect),
                texts: [...document.querySelectorAll('#hero h1, #hero p, #hero a, #hero dt, #hero dd')]
                    .map(rect),
                mood: layer.dataset.frogMood,
                motion: layer.dataset.frogMotion,
            };
        }"""
    )


def record_frog(page, duration_ms, click_at_ms=()):
    """Samples the frog and butterfly every frame, toggling the theme on cue."""
    return page.evaluate(
        """({ durationMs, clickAt }) => new Promise((resolve) => {
            const layer = document.querySelector('[data-hero-frog]');
            const fly = layer.querySelector('[data-critter="butterfly"]');
            const parts = {
                body: layer.querySelector('.frog-body'),
                pupil: layer.querySelector('.frog-pupil'),
            };
            const tongue = layer.querySelector('.frog-tongue');
            const drop = layer.querySelector('.frog-drop');
            const matrix = (el) => el.transform.baseVal.consolidate()?.matrix
                ?? { a: 1, b: 0, e: 0, f: 0 };
            const pending = [...clickAt];
            const samples = [];
            let start = null;
            const frame = (now) => {
                if (start === null) start = now;
                const t = now - start;
                while (pending.length && t >= pending[0]) {
                    pending.shift();
                    document.querySelector('button[aria-label^="Switch to"]').click();
                }
                const body = matrix(parts.body);
                const pupil = matrix(parts.pupil);
                const flyBox = fly.getBoundingClientRect();
                const flyStyle = getComputedStyle(fly);
                samples.push({
                    t,
                    bodyY: body.f,
                    bodyTurn: Math.atan2(body.b, body.a) * 180 / Math.PI,
                    pupil: [pupil.e, pupil.f],
                    x2: +tongue.getAttribute('x2'),
                    y2: +tongue.getAttribute('y2'),
                    drop: parseFloat(getComputedStyle(drop).opacity),
                    fly: [flyBox.left + flyBox.width / 2, flyBox.top + flyBox.height / 2],
                    flyOpacity: flyStyle.visibility === 'hidden' ? 0 : parseFloat(flyStyle.opacity),
                    motion: layer.dataset.frogMotion,
                });
                if (t < durationMs) requestAnimationFrame(frame);
                else resolve(samples);
            };
            requestAnimationFrame(frame);
        })""",
        {"durationMs": duration_ms, "clickAt": list(click_at_ms)},
    )


def tongue_is_out(sample):
    return abs(sample["x2"] - FROG_MOUTH[0]) > 0.5 or abs(sample["y2"] - FROG_MOUTH[1]) > 0.5


def tongue_clearance(sample):
    """Closest distance from either eye centre to the tongue, in SVG units."""
    mx, my = FROG_MOUTH
    dx, dy = sample["x2"] - mx, sample["y2"] - my
    length_squared = dx * dx + dy * dy
    closest = float("inf")
    for ex, ey in FROG_EYES:
        t = 0 if length_squared == 0 else max(0, min(1, ((ex - mx) * dx + (ey - my) * dy) / length_squared))
        closest = min(closest, ((ex - (mx + t * dx)) ** 2 + (ey - (my + t * dy)) ** 2) ** 0.5)
    return closest


def assert_tongue_stays_off_the_face(samples):
    for sample in filter(tongue_is_out, samples):
        reach = ((sample["x2"] - FROG_MOUTH[0]) ** 2 + (sample["y2"] - FROG_MOUTH[1]) ** 2) ** 0.5
        assert reach <= FROG_TONGUE_REACH + 1e-6, sample
        assert tongue_clearance(sample) >= FROG_EYE_RADIUS + 1 - 1e-6, sample


def run_frog_placement_check(browser):
    """Perched on the stats card, never over text, no sideways scroll."""
    viewports = [PHONE, {"width": 768, "height": 1024}, {"width": 1024, "height": 768}, DESKTOP]
    for viewport in viewports:
        for scheme in ("dark", "light"):
            context, page, errors = create_page(browser, viewport=viewport, color_scheme=scheme)
            page.wait_for_timeout(2_000)
            geometry = frog_geometry(page)
            feet = geometry["frog"]["top"] + geometry["frog"]["height"] * FROG_FEET
            assert abs(feet - geometry["stats"]["top"]) <= 1.5, (viewport, scheme, feet, geometry["stats"])
            assert geometry["frog"]["right"] <= geometry["stats"]["right"], (viewport, geometry)
            assert geometry["mood"] == ("night" if scheme == "dark" else "day")
            assert geometry["flyVisible"] == (scheme == "light"), (viewport, scheme)
            width = page.evaluate("document.documentElement.scrollWidth")
            assert width == viewport["width"], (viewport, width)
            for _ in range(15):
                geometry = frog_geometry(page)
                critters = [geometry["frog"]] + ([geometry["fly"]] if geometry["flyVisible"] else [])
                for critter in critters:
                    for text in geometry["texts"]:
                        assert not overlaps(critter, text), (viewport, scheme, critter, text)
                page.wait_for_timeout(100)
            assert not errors, errors
            context.close()


def run_frog_night_check(browser):
    context, page, errors = create_page(browser, viewport=PHONE, color_scheme="dark")
    samples = record_frog(page, FROG_ACTION_WINDOW_MS)
    catches = [
        current for previous, current in zip(samples, samples[1:])
        if previous["drop"] > 0.5 and current["drop"] < 0.5
    ]
    assert catches, "the frog never caught a raindrop"
    for catch in catches:
        assert abs(catch["x2"] - RAINDROP_CATCH[0]) < 0.5, catch
        assert abs(catch["y2"] - RAINDROP_CATCH[1]) < 0.5, catch
    assert_tongue_stays_off_the_face(samples)
    # Between catches it looks up at the rain.
    looking_up = sum(s["pupil"][1] < 0 for s in samples)
    assert looking_up > len(samples) * 0.6, looking_up
    assert not any(s["flyOpacity"] > 0.05 for s in samples)
    assert not errors, errors
    context.close()


def run_frog_day_check(browser):
    context, page, errors = create_page(browser, viewport=PHONE, color_scheme="light")
    samples = record_frog(page, FROG_ACTION_WINDOW_MS)
    geometry = frog_geometry(page)
    zone = {
        "x0": max(max(b["right"] for b in geometry["buttons"]) + ZONE_GAP,
                  geometry["frog"]["left"] - ZONE_SPAN),
        "x1": geometry["stats"]["right"] - ZONE_GAP,
        "y0": min(b["top"] for b in geometry["buttons"]) - ZONE_GAP,
        "y1": geometry["stats"]["top"] - ZONE_FLOOR,
    }
    # Once it has flown in (entrance at +1.0 s, 0.9 s long) it stays in its band.
    for sample in [s for s in samples if s["t"] > 2_500]:
        x, y = sample["fly"]
        assert zone["x0"] - 1 <= x <= zone["x1"] + 1, (sample, zone)
        assert zone["y0"] - 1 <= y <= zone["y1"] + 1, (sample, zone)
    assert any(s["bodyY"] < -6 for s in samples), "the frog never hopped at the butterfly"
    assert_tongue_stays_off_the_face(samples)
    pupils = {tuple(round(v, 1) for v in s["pupil"]) for s in samples}
    assert len(pupils) > 5, "the eyes do not follow the butterfly"
    assert not errors, errors
    context.close()


def run_frog_switch_check(browser):
    context, page, errors = create_page(browser, color_scheme="dark")
    page.wait_for_timeout(2_000)
    samples = record_frog(page, 2_600, click_at_ms=(0, 1_300))
    to_day = [s for s in samples if s["t"] < 1_300]
    to_night = [s for s in samples if s["t"] >= 1_300]
    # Day: shakes the water off, butterfly flies in, all within the sky's 1 050 ms.
    assert max(abs(s["bodyTurn"]) for s in to_day if s["t"] < 450) > 2
    assert all(abs(s["bodyTurn"]) < 0.5 for s in to_day if s["t"] > 600)
    assert all(s["flyOpacity"] > 0.95 for s in to_day if s["t"] > 1_050)
    # Night: the butterfly leaves within its 0.5 s exit, the frog looks up.
    assert all(s["flyOpacity"] < 0.05 for s in to_night if s["t"] > 1_300 + 600)
    assert to_night[-1]["pupil"][1] < 0, to_night[-1]
    assert not errors, errors
    context.close()


def run_frog_pause_check(browser):
    context, page, errors = create_page(browser, color_scheme="light")
    page.wait_for_timeout(2_500)
    page.get_by_role("button", name="Pause background animation").first.click()
    page.wait_for_timeout(150)
    samples = record_frog(page, 700)
    assert all(s["motion"] == "paused" for s in samples)
    assert len({tuple(s["fly"]) for s in samples}) == 1, "the butterfly kept flying"
    assert len({tuple(s["pupil"]) for s in samples}) == 1, "the eyes kept moving"
    page.get_by_role("button", name="Pause background animation").first.click()
    assert page.locator(FROG_LAYER).get_attribute("data-frog-motion") == "running"
    assert not errors, errors
    context.close()


def run_frog_reduced_motion_check(browser):
    for scheme in ("light", "dark"):
        context, page, errors = create_page(
            browser, viewport=PHONE, color_scheme=scheme, reduced_motion="reduce"
        )
        samples = record_frog(page, 900)
        assert all(s["motion"] == "reduced" for s in samples)
        assert len({(s["bodyY"], s["bodyTurn"]) for s in samples}) == 1, "the frog moved"
        assert not any(tongue_is_out(s) for s in samples)
        if scheme == "light":
            assert all(s["flyOpacity"] == 1 for s in samples)
            assert len({tuple(s["fly"]) for s in samples}) == 1, "the butterfly moved"
        else:
            assert all(s["flyOpacity"] == 0 for s in samples)
        frog = page.locator('[data-critter="frog"]')
        assert frog.evaluate("el => getComputedStyle(el).visibility") == "visible"
        assert not errors, errors
        context.close()


def run_frog_offscreen_check(browser):
    context, page, errors = create_page(browser, color_scheme="dark")
    page.wait_for_timeout(2_000)
    layer = page.locator(FROG_LAYER)
    page.locator("#contact").scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    assert layer.get_attribute("data-frog-motion") == "offscreen"
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(400)
    assert layer.get_attribute("data-frog-motion") == "running"
    assert not errors, errors
    context.close()


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
    run_frog_placement_check(chromium)
    run_frog_night_check(chromium)
    run_frog_day_check(chromium)
    run_frog_switch_check(chromium)
    run_frog_pause_check(chromium)
    run_frog_reduced_motion_check(chromium)
    run_frog_offscreen_check(chromium)
    chromium.close()

print("sky scene browser checks passed")
