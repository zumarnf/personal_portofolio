from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:5173"
VIEWPORT = {"width": 1280, "height": 800}
MOTION_TIMEOUT_MS = 18_000


def wait_for_phase(page, phase, timeout=10_000):
    page.wait_for_function(
        """phase =>
            document.querySelector('[data-scroll-figure]')
                ?.dataset.motionPhase === phase
        """,
        arg=phase,
        timeout=timeout,
    )


def create_page(browser, viewport=VIEWPORT, **context_options):
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
    page.evaluate("document.documentElement.style.scrollBehavior = 'auto'")
    return context, page, errors


def assert_subsequence(values, expected):
    position = 0
    for value in values:
        if position < len(expected) and value == expected[position]:
            position += 1
    assert position == len(expected), f"{expected} not found in {values}"


def capture_motion(
    page,
    delta,
    *,
    phase_actions=None,
    required_counts=None,
):
    return page.evaluate(
        """({
            delta,
            phaseActions,
            requiredCounts,
            timeoutMs,
        }) => new Promise((resolve) => {
            const figure = document.querySelector('[data-scroll-figure]');
            const actor = figure?.querySelector('.sf-actor');
            const head = figure?.querySelector('.sf-head');
            const platform = figure?.querySelector('.sf-platform');
            if (!figure || !actor || !head || !platform) {
                resolve({ error: 'figure rig not found' });
                return;
            }

            const rectToObject = (rect) => ({
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
            });
            const startedAt = performance.now();
            const baseline = {
                actor: rectToObject(actor.getBoundingClientRect()),
                head: rectToObject(head.getBoundingClientRect()),
                platform: rectToObject(platform.getBoundingClientRect()),
            };
            const phases = [{
                phase: figure.dataset.motionPhase,
                t: 0,
            }];
            const samples = [];
            const markers = [];
            const timers = [];
            const phaseCounts = {};
            const triggeredActions = new Set();
            let animationFrame = 0;
            let completed = false;
            let lastPhase = figure.dataset.motionPhase;
            let started = false;

            const captureRig = () => ({
                actor: rectToObject(actor.getBoundingClientRect()),
                head: rectToObject(head.getBoundingClientRect()),
                platform: rectToObject(platform.getBoundingClientRect()),
            });

            const scheduleAction = (action, actionIndex) => {
                if (triggeredActions.has(actionIndex)) return;
                triggeredActions.add(actionIndex);
                (action.deltas || []).forEach((entry, deltaIndex) => {
                    timers.push(window.setTimeout(() => {
                        if (deltaIndex === 0) {
                            markers.push({
                                name: action.name,
                                t: performance.now() - startedAt,
                                phase: figure.dataset.motionPhase,
                                ...captureRig(),
                            });
                        }
                        window.scrollBy(0, entry.amount);
                    }, entry.delay));
                });
            };

            const recordPhase = () => {
                const phase = figure.dataset.motionPhase;
                if (phase === lastPhase) return;
                lastPhase = phase;
                started = started || phase !== 'idle';
                phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
                phases.push({ phase, t: performance.now() - startedAt });
                (phaseActions || []).forEach((action, actionIndex) => {
                    const occurrence = action.occurrence || 1;
                    if (
                        action.phase === phase &&
                        phaseCounts[phase] === occurrence
                    ) {
                        scheduleAction(action, actionIndex);
                    }
                });
            };

            const observer = new MutationObserver(recordPhase);
            observer.observe(figure, {
                attributes: true,
                attributeFilter: ['data-motion-phase'],
                attributeOldValue: true,
            });

            const finish = (error) => {
                if (completed) return;
                completed = true;
                observer.disconnect();
                window.cancelAnimationFrame(animationFrame);
                timers.forEach((timer) => window.clearTimeout(timer));
                resolve({
                    error,
                    baseline,
                    phases,
                    phaseCounts,
                    samples,
                    markers,
                    finalActor: rectToObject(actor.getBoundingClientRect()),
                    finalPlatform: rectToObject(platform.getBoundingClientRect()),
                });
            };

            const timeout = window.setTimeout(
                () => finish('flight capture timed out'),
                timeoutMs,
            );
            timers.push(timeout);

            const sampleFrame = () => {
                recordPhase();
                if (started) {
                    const actorRect = actor.getBoundingClientRect();
                    const headRect = head.getBoundingClientRect();
                    const platformRect = platform.getBoundingClientRect();
                    samples.push({
                        t: performance.now() - startedAt,
                        phase: figure.dataset.motionPhase,
                        actor: rectToObject(actorRect),
                        head: rectToObject(headRect),
                        platform: rectToObject(platformRect),
                    });
                }

                const requirementsMet = Object.entries(
                    requiredCounts || {},
                ).every(([phase, count]) => (
                    (phaseCounts[phase] || 0) >= count
                ));
                const finishedMotion =
                    started &&
                    requirementsMet &&
                    figure.dataset.motionPhase === 'idle';
                if (finishedMotion) {
                    window.clearTimeout(timeout);
                    finish(null);
                    return;
                }

                animationFrame = window.requestAnimationFrame(sampleFrame);
            };

            animationFrame = window.requestAnimationFrame(sampleFrame);
            window.requestAnimationFrame(() => window.scrollBy(0, delta));
        })""",
        {
            "delta": delta,
            "phaseActions": phase_actions or [],
            "requiredCounts": required_counts or {"impact": 1},
            "timeoutMs": MOTION_TIMEOUT_MS,
        },
    )


def phase_names(capture):
    return [entry["phase"] for entry in capture["phases"]]


def first_phase_time(capture, phase):
    return next(
        entry["t"] for entry in capture["phases"] if entry["phase"] == phase
    )


def maximum_sample_speed(capture):
    maximum = 0
    for previous, current in zip(capture["samples"], capture["samples"][1:]):
        elapsed = current["t"] - previous["t"]
        if elapsed <= 0 or elapsed > 50:
            continue
        dx = current["actor"]["left"] - previous["actor"]["left"]
        dy = current["actor"]["top"] - previous["actor"]["top"]
        maximum = max(maximum, ((dx * dx + dy * dy) ** 0.5) / (elapsed / 1000))
    return maximum


def maximum_vertical_speed(capture, phase):
    maximum = 0
    phase_samples = [
        sample for sample in capture["samples"] if sample["phase"] == phase
    ]
    for previous, current in zip(phase_samples, phase_samples[1:]):
        elapsed = current["t"] - previous["t"]
        if elapsed <= 0 or elapsed > 50:
            continue
        distance = current["actor"]["top"] - previous["actor"]["top"]
        maximum = max(maximum, distance / (elapsed / 1000))
    return maximum


def find_marker(capture, name):
    return next(marker for marker in capture["markers"] if marker["name"] == name)


def assert_no_teleport(capture, maximum_jump=70):
    for previous, current in zip(capture["samples"], capture["samples"][1:]):
        elapsed = current["t"] - previous["t"]
        if elapsed <= 0 or elapsed > 50:
            continue
        dx = current["actor"]["left"] - previous["actor"]["left"]
        dy = current["actor"]["top"] - previous["actor"]["top"]
        assert (dx * dx + dy * dy) ** 0.5 < maximum_jump, (previous, current)


def assert_kneel_geometry(capture):
    compression_samples = [
        sample for sample in capture["samples"] if sample["phase"] == "compress"
    ]
    assert compression_samples
    deepest = min(
        compression_samples,
        key=lambda sample: sample["platform"]["top"],
    )
    baseline_head = capture["baseline"]["head"]
    baseline_platform = capture["baseline"]["platform"]
    baseline_gap = baseline_platform["top"] - baseline_head["bottom"]
    compressed_gap = deepest["platform"]["top"] - deepest["head"]["bottom"]
    assert deepest["platform"]["top"] < baseline_platform["top"] - 3
    assert deepest["actor"]["top"] < capture["baseline"]["actor"]["top"] - 3
    assert compressed_gap < baseline_gap - 2

    final_platform = capture["finalPlatform"]
    assert abs(final_platform["left"] - baseline_platform["left"]) < 4
    assert abs(final_platform["top"] - baseline_platform["top"]) < 4


def assert_capture_is_unclipped(capture, viewport=VIEWPORT):
    for sample in capture["samples"]:
        rect = sample["actor"]
        assert rect["left"] >= -1, sample
        assert rect["top"] >= -1, sample
        assert rect["right"] <= viewport["width"] + 1, sample
        assert rect["bottom"] <= viewport["height"] + 1, sample


def assert_landed_at_baseline(capture):
    baseline = capture["baseline"]["actor"]
    landed = capture["finalActor"]
    assert abs(landed["left"] - baseline["left"]) < 4
    assert abs(landed["top"] - baseline["top"]) < 4


def assert_normal_flight(capture, viewport=VIEWPORT):
    assert not capture.get("error"), capture.get("error")
    names = phase_names(capture)
    assert_subsequence(
        names,
        ["launch", "apex", "glide", "impact", "settle", "idle"],
    )
    assert names.count("launch") == 1, names
    assert_capture_is_unclipped(capture, viewport)
    assert_landed_at_baseline(capture)

    ascent_ms = first_phase_time(capture, "apex") - first_phase_time(
        capture, "launch"
    )
    glide_ms = first_phase_time(capture, "impact") - first_phase_time(
        capture, "glide"
    )
    assert glide_ms > ascent_ms * 1.1, (ascent_ms, glide_ms)
    assert maximum_sample_speed(capture) < 1_600


def run_trajectory_checks(browser):
    gentle_context, gentle_page, gentle_errors = create_page(browser)
    wait_for_phase(gentle_page, "idle")
    gentle = capture_motion(gentle_page, 12)
    assert_normal_flight(gentle)
    gentle_context.close()

    strong_context, strong_page, strong_errors = create_page(browser)
    wait_for_phase(strong_page, "idle")
    strong = capture_motion(strong_page, 96)
    assert_normal_flight(strong)

    gentle_left_travel = (
        gentle["baseline"]["actor"]["left"]
        - min(sample["actor"]["left"] for sample in gentle["samples"])
    )
    strong_left_travel = (
        strong["baseline"]["actor"]["left"]
        - min(sample["actor"]["left"] for sample in strong["samples"])
    )
    gentle_rise = (
        gentle["baseline"]["actor"]["top"]
        - min(sample["actor"]["top"] for sample in gentle["samples"])
    )
    strong_rise = (
        strong["baseline"]["actor"]["top"]
        - min(sample["actor"]["top"] for sample in strong["samples"])
    )
    assert strong_left_travel > gentle_left_travel + 40
    assert strong_rise > gentle_rise + 40

    overflow = strong_page.evaluate(
        """() => {
            const figure = document.querySelector('[data-scroll-figure]');
            const svg = figure.querySelector('svg');
            const wrapper = figure.parentElement;
            return [svg, figure, wrapper].map((element) => {
                const style = getComputedStyle(element);
                return [style.overflowX, style.overflowY];
            });
        }"""
    )
    assert all(
        horizontal == "visible" and vertical == "visible"
        for horizontal, vertical in overflow
    ), overflow
    assert not gentle_errors, gentle_errors
    assert not strong_errors, strong_errors
    normal_glide_ms = first_phase_time(strong, "impact") - first_phase_time(
        strong, "glide"
    )
    strong_context.close()
    return normal_glide_ms


def run_airborne_boost_check(browser):
    context, page, errors = create_page(browser)
    wait_for_phase(page, "idle")
    capture = capture_motion(
        page,
        96,
        phase_actions=[
            {
                "name": "boost",
                "phase": "glide",
                "occurrence": 1,
                "deltas": [
                    {"delay": 0, "amount": 48},
                    {"delay": 24, "amount": 12},
                    {"delay": 48, "amount": 12},
                ],
            }
        ],
        required_counts={"boost": 1, "impact": 1},
    )
    assert not capture.get("error"), capture.get("error")
    names = phase_names(capture)
    assert_subsequence(
        names,
        [
            "launch",
            "apex",
            "glide",
            "boost",
            "apex",
            "glide",
            "impact",
            "settle",
            "idle",
        ],
    )
    assert names.count("launch") == 1, names
    assert names.count("boost") == 1, names
    marker = find_marker(capture, "boost")
    boosted_samples = [
        sample
        for sample in capture["samples"]
        if sample["t"] >= marker["t"] and sample["phase"] in {"boost", "apex"}
    ]
    assert boosted_samples
    assert (
        marker["actor"]["top"]
        - min(sample["actor"]["top"] for sample in boosted_samples)
        >= 25
    )
    assert_no_teleport(capture)
    assert_capture_is_unclipped(capture)
    assert_landed_at_baseline(capture)
    assert not errors, errors
    context.close()


def run_slam_during_launch_check(browser, normal_glide_ms):
    context, page, errors = create_page(browser)
    wait_for_phase(page, "idle")
    capture = capture_motion(
        page,
        96,
        phase_actions=[
            {
                "name": "slam_launch",
                "phase": "launch",
                "occurrence": 1,
                "deltas": [{"delay": 80, "amount": -48}],
            }
        ],
        required_counts={"slam": 1, "impact": 1},
    )
    assert not capture.get("error"), capture.get("error")
    names = phase_names(capture)
    assert_subsequence(names, ["launch", "slam", "impact", "settle", "idle"])
    assert names.count("slam") == 1, names
    assert "compress" not in names
    slam_ms = first_phase_time(capture, "impact") - first_phase_time(
        capture, "slam"
    )
    assert slam_ms < min(normal_glide_ms, 1_200)
    assert maximum_vertical_speed(capture, "slam") > 300
    assert_no_teleport(capture)
    assert_capture_is_unclipped(capture)
    assert_landed_at_baseline(capture)
    assert not errors, errors
    context.close()


def run_slam_rescue_check(browser):
    context, page, errors = create_page(browser)
    wait_for_phase(page, "idle")
    capture = capture_motion(
        page,
        96,
        phase_actions=[
            {
                "name": "start_slam",
                "phase": "glide",
                "occurrence": 1,
                "deltas": [{"delay": 0, "amount": -48}],
            },
            {
                "name": "rescue",
                "phase": "slam",
                "occurrence": 1,
                "deltas": [
                    {"delay": 80, "amount": 96},
                    {"delay": 104, "amount": 12},
                ],
            },
        ],
        required_counts={"slam": 1, "boost": 1, "impact": 1},
    )
    assert not capture.get("error"), capture.get("error")
    names = phase_names(capture)
    assert_subsequence(
        names,
        [
            "launch",
            "apex",
            "glide",
            "slam",
            "boost",
            "apex",
            "glide",
            "impact",
            "settle",
            "idle",
        ],
    )
    assert names.count("slam") == 1, names
    assert names.count("boost") == 1, names
    assert names.count("impact") == 1, names

    slam_marker = find_marker(capture, "start_slam")
    rescue_marker = find_marker(capture, "rescue")
    assert rescue_marker["actor"]["top"] > slam_marker["actor"]["top"] + 4
    rescued_samples = [
        sample
        for sample in capture["samples"]
        if sample["t"] >= rescue_marker["t"]
        and sample["phase"] in {"boost", "apex"}
    ]
    assert rescued_samples
    assert (
        rescue_marker["actor"]["top"]
        - min(sample["actor"]["top"] for sample in rescued_samples)
        >= 25
    )
    assert_no_teleport(capture)
    assert_capture_is_unclipped(capture)
    assert_landed_at_baseline(capture)
    assert not errors, errors
    context.close()


def run_grounded_kneel_check(browser):
    context, page, errors = create_page(browser)
    wait_for_phase(page, "idle")
    warmup = capture_motion(page, 96)
    assert_normal_flight(warmup)

    kneel = capture_motion(
        page,
        -48,
        required_counts={"compress": 1},
    )
    assert not kneel.get("error"), kneel.get("error")
    names = phase_names(kneel)
    assert_subsequence(names, ["compress", "settle", "idle"])
    assert "slam" not in names
    assert "launch" not in names
    assert_kneel_geometry(kneel)
    assert_no_teleport(kneel)
    assert_capture_is_unclipped(kneel)
    assert_landed_at_baseline(kneel)
    assert not errors, errors
    context.close()


def run_queued_kneel_check(browser):
    context, page, errors = create_page(browser)
    wait_for_phase(page, "idle")
    capture = capture_motion(
        page,
        96,
        phase_actions=[
            {
                "name": "queue_kneel",
                "phase": "impact",
                "occurrence": 1,
                "deltas": [{"delay": 0, "amount": -48}],
            }
        ],
        required_counts={"impact": 1, "compress": 1},
    )
    assert not capture.get("error"), capture.get("error")
    names = phase_names(capture)
    assert_subsequence(
        names,
        [
            "launch",
            "apex",
            "glide",
            "impact",
            "settle",
            "compress",
            "settle",
            "idle",
        ],
    )
    assert "slam" not in names
    assert names.count("compress") == 1, names
    assert names.index("compress") > names.index("settle")
    assert_kneel_geometry(capture)
    assert_no_teleport(capture)
    assert_capture_is_unclipped(capture)
    assert_landed_at_baseline(capture)
    assert not errors, errors
    context.close()


def run_narrow_desktop_check(browser):
    viewport = {"width": 680, "height": 560}
    context, page, errors = create_page(browser, viewport=viewport)
    wait_for_phase(page, "idle")
    capture = capture_motion(page, 96)
    assert_normal_flight(capture, viewport)
    assert not errors, errors
    context.close()


def run_reduced_motion_check(browser):
    context, page, errors = create_page(browser, reduced_motion="reduce")
    figure = page.locator("[data-scroll-figure]")
    actor = figure.locator(".sf-actor")
    platform = figure.locator(".sf-platform")
    umbrella = figure.locator(".sf-umbrella")
    wait_for_phase(page, "reduced")
    before = [item.bounding_box() for item in (actor, platform, umbrella)]
    page.evaluate("window.scrollBy(0, 240)")
    page.evaluate("window.scrollBy(0, 120)")
    page.evaluate("window.scrollBy(0, -120)")
    page.wait_for_timeout(400)
    after = [item.bounding_box() for item in (actor, platform, umbrella)]
    for initial, final in zip(before, after):
        assert initial and final
        assert abs(final["x"] - initial["x"]) < 0.5
        assert abs(final["y"] - initial["y"]) < 0.5
    assert figure.get_attribute("data-motion-phase") == "reduced"
    assert not errors, errors
    context.close()


def run_live_reduced_motion_check(browser):
    context, page, errors = create_page(browser)
    figure = page.locator("[data-scroll-figure]")
    actor = figure.locator(".sf-actor")
    platform = figure.locator(".sf-platform")
    umbrella = figure.locator(".sf-umbrella")
    wait_for_phase(page, "idle")
    baseline = [item.bounding_box() for item in (actor, platform, umbrella)]

    page.evaluate(
        """() => new Promise((resolve) => {
            const figure = document.querySelector('[data-scroll-figure]');
            const observer = new MutationObserver(() => {
                if (figure.dataset.motionPhase !== 'slam') return;
                observer.disconnect();
                resolve();
            });
            observer.observe(figure, {
                attributes: true,
                attributeFilter: ['data-motion-phase'],
            });
            window.scrollBy(0, 96);
            window.setTimeout(() => window.scrollBy(0, -48), 80);
        })"""
    )
    page.wait_for_timeout(40)
    page.emulate_media(reduced_motion="reduce")
    wait_for_phase(page, "reduced")
    page.wait_for_timeout(100)
    reduced = [item.bounding_box() for item in (actor, platform, umbrella)]
    for initial, final in zip(baseline, reduced):
        assert initial and final
        assert abs(final["x"] - initial["x"]) < 3
        assert abs(final["y"] - initial["y"]) < 3

    page.emulate_media(reduced_motion="no-preference")
    wait_for_phase(page, "idle")
    resumed = capture_motion(page, 12)
    assert_normal_flight(resumed)
    assert not errors, errors
    context.close()


def run_mobile_check(browser):
    context = browser.new_context(viewport={"width": 500, "height": 800})
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
    figure = page.locator("[data-scroll-figure]")
    assert not figure.is_visible()
    initial_phase = figure.get_attribute("data-motion-phase")
    page.evaluate("window.scrollBy(0, 240)")
    page.evaluate("window.scrollBy(0, 120)")
    page.evaluate("window.scrollBy(0, -120)")
    page.wait_for_timeout(300)
    assert figure.get_attribute("data-motion-phase") == initial_phase
    assert initial_phase in {None, "static"}
    assert not errors, errors
    context.close()


with sync_playwright() as playwright:
    chromium = playwright.chromium.launch(headless=True)
    normal_glide_ms = run_trajectory_checks(chromium)
    run_airborne_boost_check(chromium)
    run_slam_during_launch_check(chromium, normal_glide_ms)
    run_slam_rescue_check(chromium)
    run_grounded_kneel_check(chromium)
    run_queued_kneel_check(chromium)
    run_narrow_desktop_check(chromium)
    run_reduced_motion_check(chromium)
    run_live_reduced_motion_check(chromium)
    run_mobile_check(chromium)
    chromium.close()

print("scroll figure browser checks passed")
