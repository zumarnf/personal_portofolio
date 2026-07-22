import { useEffect, useRef } from "react";
import gsap from "gsap";
import RainFigure from "@/components/ui/RainFigure";
import {
  applyFlightBoost,
  approachTerminalVelocity,
  accumulateImpulse,
  createLaunchMotion,
  createSlamMotion,
  readAccumulatedScrollTick,
  startsNewScrollBurst,
} from "@/components/ui/scrollFigureMotion";

const LAUNCH_GRAVITY = 950;
const LAUNCH_HORIZONTAL_DRAG = 0.35;
const GLIDE_DRAG = 3.4;
const GLIDE_SPRING = 5.2;
const GLIDE_DAMPING = 4.6;
const APEX_DURATION = 0.12;
const LANDING_CLEARANCE = 9;
const LANDING_POSITION_EPSILON = 2.5;
const FLIGHT_PHASES = new Set([
  "launch",
  "boost",
  "apex",
  "glide",
  "slam",
]);

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function isFlightPhase(phase) {
  return FLIGHT_PHASES.has(phase);
}

/**
 * Scroll-reactive corner mascot. The first tick of a downward burst supplies
 * one launch impulse; the umbrella then turns the descent into a slow glide.
 */
export default function ScrollFigure() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const media = gsap.matchMedia();

    media.add(
      {
        desktop: "(min-width: 640px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { desktop, reduceMotion } = context.conditions;
        const svg = root.querySelector("svg");
        const actor = root.querySelector(".sf-actor");
        const platform = root.querySelector(".sf-platform");
        const upper = root.querySelector(".sf-upper");
        const head = root.querySelector(".sf-head");
        const armLeft = root.querySelector(".sf-arm-l");
        const armRight = root.querySelector(".sf-arm-r");
        const thighLeft = root.querySelector(".sf-thigh-l");
        const thighRight = root.querySelector(".sf-thigh-r");
        const shinLeft = root.querySelector(".sf-shin-l");
        const shinRight = root.querySelector(".sf-shin-r");
        const umbrella = root.querySelector(".sf-umbrella");

        const targets = [
          actor,
          platform,
          upper,
          head,
          armLeft,
          armRight,
          thighLeft,
          thighRight,
          shinLeft,
          shinRight,
          umbrella,
        ];

        if (!svg || targets.some((target) => !target)) {
          root.dataset.motionPhase = "static";
          return undefined;
        }

        gsap.set(targets, {
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        });
        gsap.set(actor, { opacity: 1 });

        if (!desktop || reduceMotion) {
          root.dataset.motionPhase = reduceMotion ? "reduced" : "static";
          return undefined;
        }

        gsap.set(actor, { svgOrigin: "62 160" });
        gsap.set(platform, { svgOrigin: "62 161" });
        gsap.set(upper, { svgOrigin: "62 126" });
        gsap.set(head, { svgOrigin: "62 80" });
        gsap.set(armLeft, { svgOrigin: "62 98" });
        gsap.set(armRight, { svgOrigin: "62 98" });
        gsap.set(thighLeft, { svgOrigin: "62 126" });
        gsap.set(thighRight, { svgOrigin: "62 126" });
        gsap.set(shinLeft, { svgOrigin: "55 141" });
        gsap.set(shinRight, { svgOrigin: "69 141" });
        gsap.set(umbrella, { svgOrigin: "74 104" });

        const state = {
          phase: "idle",
          x: 0,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          minX: 0,
          minY: 0,
          unitScale: 1,
          gravity: LAUNCH_GRAVITY,
          horizontalDrag: LAUNCH_HORIZONTAL_DRAG,
          terminalVelocity: 108,
          maxVelocityY: 1200,
          apexElapsed: 0,
          upImpulse: 0,
          pendingUpImpulse: 0,
          residualScrollDelta: 0,
          lastScrollY: window.scrollY,
          lastInputDirection: "idle",
          lastInputAt: Number.NEGATIVE_INFINITY,
        };

        let landingTimeline = null;
        let compressionTimeline = null;
        let recoveryCall = null;

        const setActorX = gsap.quickSetter(actor, "x", "px");
        const setActorY = gsap.quickSetter(actor, "y", "px");
        const setActorRotation = gsap.quickSetter(actor, "rotation", "deg");
        const setPhase = (phase) => {
          state.phase = phase;
          root.dataset.motionPhase = phase;
        };

        let idleTimeline = null;

        function stopIdle() {
          idleTimeline?.kill();
          idleTimeline = null;
        }

        function resumeIdle() {
          if (document.hidden) return;

          idleTimeline?.kill();
          idleTimeline = gsap
            .timeline({
              repeat: -1,
              yoyo: true,
              defaults: { duration: 2.1, ease: "sine.inOut" },
            })
            .to(upper, { y: -1.2 }, 0)
            .to(head, { rotation: 1.1 }, 0)
            .to(umbrella, { rotation: 0.8 }, 0);
        }

        function killInteractionMotion() {
          landingTimeline?.kill();
          compressionTimeline?.kill();
          recoveryCall?.kill();
          recoveryCall = null;
          gsap.killTweensOf(targets);
        }

        function tweenNeutralPose(duration = 0.18) {
          const options = {
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            duration,
            ease: "power3.out",
            overwrite: "auto",
          };

          gsap.to(platform, options);
          gsap.to(upper, options);
          gsap.to(head, options);
          gsap.to(armLeft, options);
          gsap.to(armRight, options);
          gsap.to(thighLeft, options);
          gsap.to(thighRight, options);
          gsap.to(shinLeft, options);
          gsap.to(shinRight, options);
          gsap.to(umbrella, options);
        }

        function readTransformNumber(target, property) {
          const value = Number(gsap.getProperty(target, property));
          return Number.isFinite(value) ? value : 0;
        }

        function applyFlightTransform() {
          state.x = clamp(state.x, state.minX, 0);
          state.y = Math.max(state.y, state.minY);

          let tilt = clamp(state.velocityX / 70, -6, 6);
          if (["launch", "boost"].includes(state.phase)) {
            tilt = clamp(state.velocityX / 55, -9, 2);
          }
          if (state.phase === "slam") {
            tilt = clamp(state.velocityX / 150, 0, 8);
          }

          setActorX(state.x / state.unitScale);
          setActorY(state.y / state.unitScale);
          setActorRotation(tilt);
        }

        function enterApex() {
          if (!["launch", "boost"].includes(state.phase)) return;

          state.apexElapsed = 0;
          state.velocityY = Math.max(state.velocityY, 0);
          state.velocityX *= 0.72;
          setPhase("apex");

          gsap.to(umbrella, {
            y: -10,
            rotation: 2.5,
            scaleX: 1.04,
            scaleY: 0.98,
            duration: 0.18,
            ease: "back.out(1.5)",
            overwrite: "auto",
          });
          gsap.to([armLeft, armRight], {
            rotation: (index) => (index === 0 ? -4 : 4),
            duration: 0.18,
            ease: "power3.out",
            overwrite: "auto",
          });
        }

        function enterGlide() {
          if (state.phase !== "apex") return;

          setPhase("glide");
          gsap.to(upper, {
            y: 0,
            rotation: 1.5,
            duration: 0.28,
            ease: "sine.out",
            overwrite: "auto",
          });
          gsap.to(head, {
            rotation: -1.5,
            duration: 0.28,
            ease: "sine.out",
            overwrite: "auto",
          });
          gsap.to(thighLeft, {
            rotation: 7,
            duration: 0.34,
            ease: "sine.inOut",
            overwrite: "auto",
          });
          gsap.to(thighRight, {
            rotation: -7,
            duration: 0.34,
            ease: "sine.inOut",
            overwrite: "auto",
          });
          gsap.to(shinLeft, {
            rotation: -10,
            duration: 0.34,
            ease: "sine.inOut",
            overwrite: "auto",
          });
          gsap.to(shinRight, {
            rotation: 10,
            duration: 0.34,
            ease: "sine.inOut",
            overwrite: "auto",
          });
        }

        function beginFlight(strength) {
          if (
            isFlightPhase(state.phase) ||
            (landingTimeline && ["impact", "settle"].includes(state.phase))
          ) {
            return;
          }

          stopIdle();
          killInteractionMotion();

          const actorRect = actor.getBoundingClientRect();
          const motion = createLaunchMotion(
            strength,
            window.innerWidth,
            window.innerHeight,
            actorRect
          );
          const svgRect = svg.getBoundingClientRect();
          const unitScale = Math.max(svgRect.height / 168, 0.01);

          state.x = readTransformNumber(actor, "x") * unitScale;
          state.y = readTransformNumber(actor, "y") * unitScale;
          state.unitScale = unitScale;
          state.velocityX = motion.velocityX;
          state.velocityY = motion.velocityY;
          state.gravity = motion.gravity;
          state.horizontalDrag = motion.horizontalDrag;
          state.terminalVelocity = motion.terminalVelocity;
          state.minX = Math.max(
            motion.minX,
            state.x - Math.max(actorRect.left - 12, 0)
          );
          state.minY = Math.max(
            motion.minY,
            state.y - Math.max(actorRect.top - 12, 0)
          );
          state.apexElapsed = 0;
          state.upImpulse = 0;
          state.pendingUpImpulse = 0;
          setPhase("launch");

          gsap.to(actor, {
            opacity: 1,
            duration: 0.08,
            ease: "power2.out",
            overwrite: "auto",
          });
          gsap.to(platform, {
            y: 0,
            scaleX: 1,
            scaleY: 1,
            duration: 0.14,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(upper, {
            y: -2,
            rotation: -4,
            duration: 0.16,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(head, {
            y: 0,
            rotation: -3,
            duration: 0.16,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(armLeft, {
            rotation: -6,
            duration: 0.16,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(armRight, {
            rotation: -10,
            duration: 0.16,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(thighLeft, {
            rotation: 10,
            duration: 0.16,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(thighRight, {
            rotation: -8,
            duration: 0.16,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(shinLeft, {
            rotation: -14,
            duration: 0.16,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(shinRight, {
            rotation: 12,
            duration: 0.16,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(umbrella, {
            y: -6,
            rotation: -5,
            scaleX: 1,
            scaleY: 1,
            duration: 0.16,
            ease: "power3.out",
            overwrite: "auto",
          });
        }

        function boostFlight(strength) {
          if (!isFlightPhase(state.phase)) return;

          const boost = applyFlightBoost(
            state.velocityX,
            state.velocityY,
            strength
          );
          state.velocityX = boost.velocityX;
          state.velocityY = boost.velocityY;
          state.gravity = LAUNCH_GRAVITY;
          state.horizontalDrag = LAUNCH_HORIZONTAL_DRAG;
          state.apexElapsed = 0;
          setPhase("boost");

          gsap.to(upper, {
            y: -2.5,
            rotation: -5,
            duration: 0.12,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(head, {
            y: -0.8,
            rotation: -4,
            duration: 0.12,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(armLeft, {
            rotation: -8,
            duration: 0.12,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(armRight, {
            rotation: -12,
            duration: 0.12,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(thighLeft, {
            rotation: 12,
            duration: 0.12,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(thighRight, {
            rotation: -10,
            duration: 0.12,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to([shinLeft, shinRight], {
            rotation: (index) => (index === 0 ? -16 : 14),
            duration: 0.12,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(umbrella, {
            y: -8,
            rotation: -7,
            scaleX: 1.02,
            scaleY: 1,
            duration: 0.12,
            ease: "back.out(1.4)",
            overwrite: "auto",
          });
        }

        function slamFlight(strength) {
          if (!isFlightPhase(state.phase)) return;

          const slam = createSlamMotion(
            strength,
            state.x,
            state.y,
            state.velocityY
          );
          state.velocityX = slam.velocityX;
          state.velocityY = slam.velocityY;
          state.gravity = slam.gravity;
          state.maxVelocityY = slam.maxVelocityY;
          state.apexElapsed = 0;
          setPhase("slam");

          gsap.to(upper, {
            y: 2,
            rotation: 8,
            duration: 0.1,
            ease: "power3.in",
            overwrite: "auto",
          });
          gsap.to(head, {
            y: 1,
            rotation: 8,
            duration: 0.1,
            ease: "power3.in",
            overwrite: "auto",
          });
          gsap.to(armLeft, {
            rotation: -14,
            duration: 0.1,
            ease: "power3.in",
            overwrite: "auto",
          });
          gsap.to(armRight, {
            rotation: 12,
            duration: 0.1,
            ease: "power3.in",
            overwrite: "auto",
          });
          gsap.to(thighLeft, {
            rotation: -6,
            duration: 0.1,
            ease: "power3.in",
            overwrite: "auto",
          });
          gsap.to(thighRight, {
            rotation: 6,
            duration: 0.1,
            ease: "power3.in",
            overwrite: "auto",
          });
          gsap.to(shinLeft, {
            rotation: 12,
            duration: 0.1,
            ease: "power3.in",
            overwrite: "auto",
          });
          gsap.to(shinRight, {
            rotation: -12,
            duration: 0.1,
            ease: "power3.in",
            overwrite: "auto",
          });
          gsap.to(umbrella, {
            y: 4,
            rotation: -11,
            scaleX: 0.92,
            scaleY: 0.82,
            duration: 0.1,
            ease: "power3.in",
            overwrite: "auto",
          });
        }

        function playLanding(landingVelocity = state.terminalVelocity) {
          const impactPower = clamp(
            Math.abs(landingVelocity) / 900,
            0.45,
            1
          );
          state.x = 0;
          state.y = 0;
          state.velocityX = 0;
          state.velocityY = 0;
          setActorX(0);
          setActorY(0);
          setActorRotation(0);

          setPhase("impact");
          landingTimeline = gsap
            .timeline({
              defaults: { overwrite: "auto" },
              onComplete: () => {
                landingTimeline = null;
                if (state.pendingUpImpulse > 0) {
                  const pendingStrength = state.pendingUpImpulse;
                  state.pendingUpImpulse = 0;
                  setPhase("idle");
                  beginCompression(pendingStrength);
                  return;
                }

                setPhase("idle");
                resumeIdle();
              },
            })
            .to(
              upper,
              {
                y: 3.5 + 3.5 * impactPower,
                rotation: 1.8 + 2.2 * impactPower,
                duration: 0.085,
                ease: "power3.out",
              },
              0
            )
            .to(
              head,
              {
                y: 1.2 + 1.6 * impactPower,
                rotation: 3 + 5 * impactPower,
                duration: 0.085,
                ease: "power3.out",
              },
              0
            )
            .to(armLeft, { rotation: -7 - 5 * impactPower, duration: 0.09, ease: "power3.out" }, 0)
            .to(armRight, { rotation: 5 + 4 * impactPower, duration: 0.09, ease: "power3.out" }, 0)
            .to(thighLeft, { rotation: -8 - 10 * impactPower, duration: 0.085, ease: "power3.out" }, 0)
            .to(thighRight, { rotation: 8 + 10 * impactPower, duration: 0.085, ease: "power3.out" }, 0)
            .to(shinLeft, { rotation: 14 + 12 * impactPower, duration: 0.085, ease: "power3.out" }, 0)
            .to(shinRight, { rotation: -14 - 12 * impactPower, duration: 0.085, ease: "power3.out" }, 0)
            .to(
              umbrella,
              {
                y: 3 + 3 * impactPower,
                rotation: 2 + 3 * impactPower,
                duration: 0.11,
                ease: "power3.out",
              },
              0
            )
            .to(
              platform,
              {
                scaleX: 1.04 + 0.07 * impactPower,
                duration: 0.085,
                ease: "power3.out",
              },
              0
            )
            .call(() => setPhase("settle"), [], 0.085)
            .to(
              [upper, head, armLeft, armRight, thighLeft, thighRight, shinLeft, shinRight, umbrella],
              {
                x: 0,
                y: 0,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                duration: 0.24,
                ease: "power3.out",
              },
              0.085
            )
            .to(platform, { scaleX: 1, duration: 0.2, ease: "power3.out" }, 0.085);
        }

        function beginCompression(strength) {
          stopIdle();

          if (isFlightPhase(state.phase)) {
            slamFlight(strength);
            return;
          }

          if (
            landingTimeline &&
            ["impact", "settle"].includes(state.phase)
          ) {
            state.pendingUpImpulse = accumulateImpulse(
              state.pendingUpImpulse,
              strength
            );
            return;
          }

          landingTimeline?.kill();
          compressionTimeline?.kill();
          state.upImpulse = accumulateImpulse(state.upImpulse, strength);
          const compression = 0.3 + state.upImpulse * 0.7;
          const platformLift = 5 + compression * 11;

          setPhase("compress");
          compressionTimeline = gsap
            .timeline({ defaults: { duration: 0.12, ease: "power3.out", overwrite: "auto" } })
            .to(platform, { y: -platformLift }, 0)
            .to(actor, { y: -platformLift }, 0)
            .to(upper, { y: 7.5 * compression, rotation: 5 * compression }, 0)
            .to(head, { y: 2.4 * compression, rotation: 7 * compression }, 0)
            .to(armLeft, { rotation: -9 * compression }, 0)
            .to(armRight, { rotation: 7 * compression }, 0)
            .to(thighLeft, { rotation: -18 * compression }, 0)
            .to(thighRight, { rotation: 18 * compression }, 0)
            .to(shinLeft, { rotation: 32 * compression }, 0)
            .to(shinRight, { rotation: -32 * compression }, 0)
            .to(umbrella, { y: 2.5 * compression, rotation: -4 * compression }, 0);

          recoveryCall?.kill();
          recoveryCall = gsap.delayedCall(0.14, recoverCompression);
        }

        function recoverCompression() {
          if (state.phase !== "compress") return;

          setPhase("settle");
          compressionTimeline?.kill();
          compressionTimeline = gsap
            .timeline({
              defaults: { duration: 0.24, ease: "power3.out", overwrite: "auto" },
              onComplete: () => {
                state.upImpulse = 0;
                state.x = 0;
                state.y = 0;
                setPhase("idle");
                resumeIdle();
              },
            })
            .to(platform, { y: 0 }, 0)
            .to(actor, { y: 0 }, 0)
            .to(upper, { y: 0, rotation: 0 }, 0)
            .to(head, { y: 0, rotation: 0 }, 0)
            .to(armLeft, { rotation: 0 }, 0)
            .to(armRight, { rotation: 0 }, 0)
            .to(thighLeft, { rotation: 0 }, 0)
            .to(thighRight, { rotation: 0 }, 0)
            .to(shinLeft, { rotation: 0 }, 0)
            .to(shinRight, { rotation: 0 }, 0)
            .to(umbrella, { y: 0, rotation: 0 }, 0);
        }

        const onScroll = () => {
          const nextScrollY = window.scrollY;
          if (document.hidden) {
            state.lastScrollY = nextScrollY;
            state.residualScrollDelta = 0;
            return;
          }

          const accumulatedTick = readAccumulatedScrollTick(
            state.residualScrollDelta,
            nextScrollY - state.lastScrollY
          );
          state.lastScrollY = nextScrollY;
          state.residualScrollDelta = accumulatedTick.residualDelta;

          const { tick } = accumulatedTick;

          if (tick.direction === "idle") return;

          const inputAt = performance.now();
          const startsBurst = startsNewScrollBurst(
            state.lastInputDirection,
            tick.direction,
            inputAt - state.lastInputAt
          );
          state.lastInputDirection = tick.direction;
          state.lastInputAt = inputAt;

          if (tick.direction === "down" && startsBurst) {
            if (isFlightPhase(state.phase)) boostFlight(tick.strength);
            else beginFlight(tick.strength);
          }
          if (tick.direction === "up") {
            if (isFlightPhase(state.phase)) {
              if (startsBurst) slamFlight(tick.strength);
            } else {
              beginCompression(tick.strength);
            }
          }
        };

        const onTick = (_time, deltaTime) => {
          if (document.hidden || !isFlightPhase(state.phase)) return;

          const seconds = Math.min(deltaTime, 40) / 1000;
          if (["launch", "boost"].includes(state.phase)) {
            state.velocityX *= Math.exp(
              -state.horizontalDrag * seconds
            );
            state.velocityY += state.gravity * seconds;
            state.x += state.velocityX * seconds;
            state.y += state.velocityY * seconds;

            if (state.x <= state.minX) {
              state.x = state.minX;
              state.velocityX = Math.max(state.velocityX, 0);
            }
            if (state.y <= state.minY) {
              state.y = state.minY;
              state.velocityY = Math.max(state.velocityY, 0);
              enterApex();
            } else if (state.velocityY >= 0) {
              enterApex();
            }

            applyFlightTransform();
            return;
          }

          if (state.phase === "slam") {
            state.velocityY = Math.min(
              state.velocityY + state.gravity * seconds,
              state.maxVelocityY
            );
            state.x += state.velocityX * seconds;
            state.y += state.velocityY * seconds;

            if (state.x >= 0) {
              state.x = 0;
              state.velocityX = 0;
            }

            const horizontalReady =
              Math.abs(state.x) <= LANDING_POSITION_EPSILON &&
              Math.abs(state.velocityX) <= 12;

            if (state.y >= -LANDING_CLEARANCE && !horizontalReady) {
              state.y = -LANDING_CLEARANCE;
            }

            if (state.y >= 0 && horizontalReady) {
              playLanding(state.velocityY);
              return;
            }

            applyFlightTransform();
            return;
          }

          state.velocityX +=
            (-state.x * GLIDE_SPRING -
              state.velocityX * GLIDE_DAMPING) *
            seconds;
          state.velocityY = approachTerminalVelocity(
            state.velocityY,
            state.terminalVelocity,
            GLIDE_DRAG,
            seconds
          );
          state.x += state.velocityX * seconds;
          state.y += state.velocityY * seconds;

          if (state.x <= state.minX) {
            state.x = state.minX;
            state.velocityX = Math.max(state.velocityX, 0);
          }
          if (state.x >= 0) {
            state.x = 0;
            state.velocityX = Math.min(state.velocityX, 0);
          }

          state.apexElapsed += seconds;
          if (
            state.phase === "apex" &&
            state.apexElapsed >= APEX_DURATION
          ) {
            enterGlide();
          }

          const horizontalReady =
            Math.abs(state.x) <= LANDING_POSITION_EPSILON &&
            Math.abs(state.velocityX) <= 12;

          if (state.y >= -LANDING_CLEARANCE && !horizontalReady) {
            state.y = -LANDING_CLEARANCE;
            state.velocityY = 0;
          }

          if (state.y >= 0 && horizontalReady) {
            playLanding(state.velocityY);
            return;
          }

          applyFlightTransform();
        };

        const onVisibilityChange = () => {
          if (document.hidden) {
            idleTimeline?.pause();
            return;
          }
          state.lastScrollY = window.scrollY;
          state.residualScrollDelta = 0;
          state.lastInputDirection = "idle";
          state.lastInputAt = Number.NEGATIVE_INFINITY;
          if (state.phase !== "idle") return;
          if (idleTimeline) idleTimeline.resume();
          else resumeIdle();
        };

        tweenNeutralPose(0);
        setPhase("idle");
        resumeIdle();
        window.addEventListener("scroll", onScroll, { passive: true });
        document.addEventListener("visibilitychange", onVisibilityChange);
        gsap.ticker.add(onTick);

        return () => {
          window.removeEventListener("scroll", onScroll);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          gsap.ticker.remove(onTick);
          recoveryCall?.kill();
          idleTimeline?.kill();
          landingTimeline?.kill();
          compressionTimeline?.kill();
          gsap.killTweensOf(targets);
          delete root.dataset.motionPhase;
        };
      },
      root
    );

    return () => media.revert();
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-20 hidden overflow-visible sm:bottom-6 sm:right-8 sm:block"
      aria-hidden="true"
    >
      <div
        ref={rootRef}
        data-scroll-figure
        className="overflow-visible"
        style={{ opacity: 0.55 }}
      >
        <RainFigure className="h-28 overflow-visible text-muted-foreground sm:h-32" />
      </div>
    </div>
  );
}
