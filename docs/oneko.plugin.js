/**
 * @name Oneko
 * @author VWilk (original), modified with petting & extras
 * @authorId 363358047784927234
 * @version 2.2
 * @description Cat follows your cursor — pet it for hearts, hear it purr, drag it around, long-press it for a nap, and maybe receive a gift!
 *   Based on Vencord's oneko (https://github.com/Vendicated/Vencord/tree/main/src/plugins/oneko)
 *   which was based on Adryd's oneko.js.
 * @source https://github.com/VWilk/Oneko_BetterDiscord/
 */

module.exports = () => {
  let cleanup = null;

  function createOneko() {
    const existing = document.getElementById("oneko");
    if (existing) existing.remove();

    const nekoEl = document.createElement("div");

    let nekoPosX = 32;
    let nekoPosY = 32;
    let mousePosX = 0;
    let mousePosY = 0;

    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReducedMotion) return () => {};

    let frameCount = 0;
    let idleTime = 0;
    let idleAnimation = null;
    let idleAnimationFrame = 0;
    let lastFrameTimestamp;
    let animationFrameId = null;

    // Petting state
    let petHappiness = 0;
    let isBeingPet = false;
    let petCooldown = false;

    // Combo state
    let petCombo = 0;
    let petComboTimer = null;

    // Gift state
    let giftCooldown = 0; // frames until gift can trigger again

    // Drag / long-press / forced-sleep state
    let pointerDown = null;        // {startX, startY, startNekoX, startNekoY, moved} while pressing
    let isDragging = false;
    let longPressTimer = null;
    let gestureSleptThisPress = false;
    let suppressNextClick = false; // a drag can emit a trailing click — ignore one
    let forceSleep = false;        // long-press sleep, persists until tapped
    let forceSleepFrame = 0;

    const nekoSpeed = 10;
    const PET_CLICK_RADIUS = 48;
    const PET_LINGER_FRAMES = 30;
    const COMBO_DECAY_MS = 2000;
    const GIFT_CHANCE = 1 / 600;
    const GIFT_MIN_IDLE = 60; // must be idle this many frames before gift is possible
    const GIFT_COOLDOWN_FRAMES = 800;
    const DRAG_THRESHOLD = 6;   // px of movement before a press becomes a drag
    const LONG_PRESS_MS = 500;  // hold this long without moving to force sleep

    const spriteSets = {
      idle: [[-3, -3]],
      alert: [[-7, -3]],
      scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
      scratchWallN: [[0, 0], [0, -1]],
      scratchWallS: [[-7, -1], [-6, -2]],
      scratchWallE: [[-2, -2], [-2, -3]],
      scratchWallW: [[-4, 0], [-4, -1]],
      tired: [[-3, -2]],
      sleeping: [[-2, 0], [-2, -1]],
      N: [[-1, -2], [-1, -3]],
      NE: [[0, -2], [0, -3]],
      E: [[-3, 0], [-3, -1]],
      SE: [[-5, -1], [-5, -2]],
      S: [[-6, -3], [-7, -2]],
      SW: [[-5, -3], [-6, -1]],
      W: [[-4, -2], [-4, -3]],
      NW: [[-1, 0], [-1, -1]]
    };

    // ── Heart color tiers by combo ──────────────────────────────────────
    const heartTiers = [
      { hearts: ["❤", "💜", "💕"], colors: ["#ab9df2"] },                          // 0-2: purple
      { hearts: ["💖", "💗", "💓", "💕"], colors: ["#f78fa7", "#ff6b9d"] },        // 3-5: pink
      { hearts: ["💛", "✨", "⭐", "💫"], colors: ["#ffd866", "#ffb347"] },         // 6-8: gold
      { hearts: ["💖", "💛", "💚", "💙", "💜", "🌈", "✨"], colors: ["#ff6b9d", "#ffd866", "#a8e6cf", "#88c0fc", "#d4a5ff"] } // 9+: rainbow
    ];

    function getComboTier() {
      if (petCombo < 3) return heartTiers[0];
      if (petCombo < 6) return heartTiers[1];
      if (petCombo < 9) return heartTiers[2];
      return heartTiers[3];
    }

    function getHeartCount() {
      return Math.min(8 + petCombo * 2, 25);
    }

    // ── Styles ──────────────────────────────────────────────────────────
    const styleEl = document.createElement("style");
    styleEl.id = "oneko-styles";
    styleEl.textContent = `
      @keyframes oneko-heartBurst {
        0%   { transform: scale(0) rotate(var(--rot)); opacity: 1; }
        60%  { opacity: 1; }
        100% { transform: scale(1.2) rotate(var(--rot)) translateY(-40px); opacity: 0; }
      }
      @keyframes oneko-zzz {
        0%   { transform: translateY(0) scale(0.6); opacity: 0.8; }
        100% { transform: translateY(-30px) scale(1); opacity: 0; }
      }
      @keyframes oneko-wiggle {
        0%, 100% { transform: rotate(0deg); }
        25%      { transform: rotate(-8deg); }
        75%      { transform: rotate(8deg); }
      }
      @keyframes oneko-giftFloat {
        0%   { transform: translateY(0) scale(0); opacity: 0; }
        15%  { transform: translateY(-5px) scale(1.2); opacity: 1; }
        25%  { transform: translateY(-10px) scale(1); opacity: 1; }
        70%  { transform: translateY(-15px) scale(1); opacity: 1; }
        100% { transform: translateY(-35px) scale(0.8); opacity: 0; }
      }
      @keyframes oneko-comboPulse {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.15); }
      }
      .oneko-heart {
        position: fixed;
        font-size: 1.6em;
        pointer-events: none;
        z-index: ${Number.MAX_SAFE_INTEGER};
        animation: oneko-heartBurst 0.8s ease-out forwards;
        user-select: none;
      }
      .oneko-heart.oneko-combo-high {
        animation: oneko-heartBurst 0.8s ease-out forwards, oneko-comboPulse 0.3s ease-in-out;
      }
      .oneko-zzz {
        position: fixed;
        font-size: 0.9em;
        pointer-events: none;
        z-index: ${Number.MAX_SAFE_INTEGER};
        animation: oneko-zzz 1.8s ease-out forwards;
        color: #b8b0d0;
        user-select: none;
        font-weight: bold;
      }
      .oneko-gift {
        position: fixed;
        font-size: 1.4em;
        pointer-events: none;
        z-index: ${Number.MAX_SAFE_INTEGER};
        animation: oneko-giftFloat 3s ease-out forwards;
        user-select: none;
      }
      #oneko.oneko-wiggle {
        animation: oneko-wiggle 0.25s ease-in-out 2;
      }
    `;
    document.head.appendChild(styleEl);

    // ── Web Audio purring engine ────────────────────────────────────────
    let audioCtx = null;
    let purrGain = null;
    let purrActive = false;
    let purrNodes = []; // track oscillators for cleanup

    function initAudio() {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        purrGain = audioCtx.createGain();
        purrGain.gain.value = 0;
        purrGain.connect(audioCtx.destination);
      } catch (e) {
        // Web Audio not available — purring silently disabled
        audioCtx = null;
      }
    }

    function startPurr() {
      if (!audioCtx || purrActive) return;
      purrActive = true;

      // Base rumble: ~25Hz
      const osc1 = audioCtx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 25;

      // Harmonic layer: ~30Hz for texture
      const osc2 = audioCtx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 30;

      // Amplitude modulation for the "throb" of a purr (~3.5Hz)
      const lfo = audioCtx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 3.5;

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.004; // modulation depth

      const mixGain = audioCtx.createGain();
      mixGain.gain.value = 0.008; // very quiet base volume

      lfo.connect(lfoGain);
      lfoGain.connect(mixGain.gain); // modulate the mix volume

      osc1.connect(mixGain);
      osc2.connect(mixGain);
      mixGain.connect(purrGain);

      osc1.start();
      osc2.start();
      lfo.start();

      purrNodes = [osc1, osc2, lfo];

      // Fade in
      purrGain.gain.cancelScheduledValues(audioCtx.currentTime);
      purrGain.gain.setValueAtTime(purrGain.gain.value, audioCtx.currentTime);
      purrGain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.3);
    }

    function stopPurr() {
      if (!audioCtx || !purrActive) return;

      // Fade out
      purrGain.gain.cancelScheduledValues(audioCtx.currentTime);
      purrGain.gain.setValueAtTime(purrGain.gain.value, audioCtx.currentTime);
      purrGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);

      // Stop oscillators after fade
      const nodesToStop = [...purrNodes];
      setTimeout(() => {
        nodesToStop.forEach((n) => {
          try { n.stop(); } catch (_) {}
        });
      }, 900);

      purrNodes = [];
      purrActive = false;
    }

    function destroyAudio() {
      stopPurr();
      if (audioCtx) {
        try { audioCtx.close(); } catch (_) {}
        audioCtx = null;
        purrGain = null;
      }
    }

    // ── Heart explosion ─────────────────────────────────────────────────
    function explodeHearts() {
      const rect = nekoEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const tier = getComboTier();
      const count = getHeartCount();
      const isHighCombo = petCombo >= 6;

      for (let i = 0; i < count; i++) {
        const heart = document.createElement("div");
        heart.className = "oneko-heart" + (isHighCombo ? " oneko-combo-high" : "");
        heart.textContent = tier.hearts[Math.floor(Math.random() * tier.hearts.length)];
        const color = tier.colors[Math.floor(Math.random() * tier.colors.length)];
        heart.style.color = color;

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const dist = 20 + Math.random() * (30 + petCombo * 3); // wider spread at high combo
        heart.style.left = `${cx + Math.cos(angle) * dist}px`;
        heart.style.top = `${cy + Math.sin(angle) * dist}px`;
        heart.style.setProperty("--rot", `${Math.random() * 360}deg`);
        heart.style.fontSize = `${1.4 + Math.random() * 0.4 + Math.min(petCombo * 0.05, 0.4)}em`;
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 850);
      }
    }

    // ── Wiggle ──────────────────────────────────────────────────────────
    function triggerWiggle() {
      nekoEl.classList.remove("oneko-wiggle");
      void nekoEl.offsetWidth;
      nekoEl.classList.add("oneko-wiggle");
    }

    // ── Sleeping zzz ────────────────────────────────────────────────────
    let zzzInterval = null;

    function startZzz() {
      if (zzzInterval) return;
      zzzInterval = setInterval(() => {
        const rect = nekoEl.getBoundingClientRect();
        const zzz = document.createElement("div");
        zzz.className = "oneko-zzz";
        zzz.textContent = "z";
        zzz.style.left = `${rect.right - 4 + Math.random() * 6}px`;
        zzz.style.top = `${rect.top - 2}px`;
        zzz.style.fontSize = `${0.7 + Math.random() * 0.5}em`;
        document.body.appendChild(zzz);
        setTimeout(() => zzz.remove(), 1800);
      }, 700);
    }

    function stopZzz() {
      if (zzzInterval) {
        clearInterval(zzzInterval);
        zzzInterval = null;
      }
    }

    // ── Gift bringing ───────────────────────────────────────────────────
    const gifts = ["🐟", "🎁", "🌸", "🍀", "🐭", "🦋", "🍃"];

    function tryBringGift() {
      if (giftCooldown > 0) {
        giftCooldown -= 1;
        return false;
      }
      if (idleTime < GIFT_MIN_IDLE) return false;
      if (idleAnimation !== null) return false; // don't interrupt other idle anims
      if (Math.random() > GIFT_CHANCE) return false;

      bringGift();
      return true;
    }

    function bringGift() {
      giftCooldown = GIFT_COOLDOWN_FRAMES;

      // Show alert sprite for a beat, then spawn gift
      setSprite("alert", 0);

      setTimeout(() => {
        const rect = nekoEl.getBoundingClientRect();
        const gift = document.createElement("div");
        gift.className = "oneko-gift";
        const giftEmoji = gifts[Math.floor(Math.random() * gifts.length)];
        gift.textContent = giftEmoji;
        gift.style.left = `${rect.left + rect.width / 2}px`;
        gift.style.top = `${rect.top - 8}px`;
        document.body.appendChild(gift);
        setTimeout(() => gift.remove(), 3000);
      }, 400);
    }

    // ── Pet combo management ────────────────────────────────────────────
    function incrementCombo() {
      petCombo += 1;
      if (petComboTimer) clearTimeout(petComboTimer);
      petComboTimer = setTimeout(() => { petCombo = 0; }, COMBO_DECAY_MS);
    }

    // ── Forced sleep (long-press) ───────────────────────────────────────
    function enterForcedSleep() {
      forceSleep = true;
      forceSleepFrame = 0;
      gestureSleptThisPress = true;
      petHappiness = 0;
      isBeingPet = false;
      idleAnimation = null;
      idleAnimationFrame = 0;
      stopPurr();
    }

    function wakeFromSleep() {
      if (!forceSleep) return;
      forceSleep = false;
      forceSleepFrame = 0;
      stopZzz();
    }

    function sleepTick() {
      if (forceSleepFrame < 8) {
        setSprite("tired", 0);
        stopZzz();
      } else {
        startZzz();
        setSprite("sleeping", Math.floor(forceSleepFrame / 4));
      }
      forceSleepFrame += 1;
    }

    // ── Event handlers ──────────────────────────────────────────────────
    const handleMouseMove = (event) => {
      mousePosX = event.clientX;
      mousePosY = event.clientY;
    };

    // Pet by clicking near (but not on) the cat — on-cat taps are owned by the
    // pointer gesture below, so skip them here to avoid double-petting.
    const handleClick = (event) => {
      if (suppressNextClick) { suppressNextClick = false; return; }
      if (event.target === nekoEl) return;
      if (petCooldown) return;
      const dx = event.clientX - nekoPosX;
      const dy = event.clientY - nekoPosY;
      if (Math.sqrt(dx * dx + dy * dy) < PET_CLICK_RADIUS) {
        petCat();
      }
    };

    const handlePointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return; // primary button only
      event.preventDefault();
      try { nekoEl.setPointerCapture(event.pointerId); } catch (_) {}
      pointerDown = {
        startX: event.clientX,
        startY: event.clientY,
        startNekoX: nekoPosX,
        startNekoY: nekoPosY,
        moved: false
      };
      isDragging = false;
      gestureSleptThisPress = false;
      nekoEl.style.cursor = "grabbing";
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        if (pointerDown && !pointerDown.moved) enterForcedSleep();
      }, LONG_PRESS_MS);
    };

    const handlePointerMove = (event) => {
      if (!pointerDown) return;
      const dx = event.clientX - pointerDown.startX;
      const dy = event.clientY - pointerDown.startY;
      if (!pointerDown.moved && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        pointerDown.moved = true;
        isDragging = true;
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      }
      if (isDragging) {
        nekoPosX = Math.min(Math.max(16, pointerDown.startNekoX + dx), window.innerWidth - 16);
        nekoPosY = Math.min(Math.max(16, pointerDown.startNekoY + dy), window.innerHeight - 16);
        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
        setDragSprite(dx, dy);
      }
    };

    const handlePointerUp = (event) => {
      if (!pointerDown) return;
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      try { nekoEl.releasePointerCapture(event.pointerId); } catch (_) {}
      nekoEl.style.cursor = "grab";
      const wasDrag = pointerDown.moved;
      const slept = gestureSleptThisPress;
      pointerDown = null;

      if (wasDrag) {
        isDragging = false;
        suppressNextClick = true;
        resetIdleAnimation();
        return;
      }
      if (slept) return;  // long-press already slept the cat this press — don't pet/wake
      petCat();           // tap → pet (also wakes a sleeping cat)
    };

    const handlePointerCancel = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      pointerDown = null;
      isDragging = false;
      nekoEl.style.cursor = "grab";
    };

    function petCat() {
      wakeFromSleep();
      petCooldown = true;
      setTimeout(() => { petCooldown = false; }, 300);

      // Init audio on first pet (requires user gesture)
      initAudio();

      incrementCombo();
      petHappiness = Math.min(petHappiness + PET_LINGER_FRAMES, PET_LINGER_FRAMES * 3);
      isBeingPet = true;

      explodeHearts();
      triggerWiggle();
      startPurr();

      if (idleAnimation === "sleeping") {
        stopZzz();
        resetIdleAnimation();
      }
    }

    // ── Sprite helpers ──────────────────────────────────────────────────
    function setSprite(name, frame) {
      const sprite = spriteSets[name][frame % spriteSets[name].length];
      nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
    }

    function setDragSprite(dx, dy) {
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (adx > ady && adx > 10) setSprite(dx > 0 ? "scratchWallW" : "scratchWallE", frameCount);
      else if (ady > adx && ady > 10) setSprite(dy > 0 ? "scratchWallN" : "scratchWallS", frameCount);
      else setSprite("alert", 0);
    }

    function resetIdleAnimation() {
      idleAnimation = null;
      idleAnimationFrame = 0;
    }

    // ── Idle logic ──────────────────────────────────────────────────────
    function idle() {
      idleTime += 1;

      // Content after petting — purring, sitting still
      if (petHappiness > 0) {
        petHappiness -= 1;
        setSprite("idle", 0);
        isBeingPet = petHappiness > 0;
        if (!isBeingPet) stopPurr();
        return;
      }
      isBeingPet = false;

      // Try gift before other idle animations
      if (tryBringGift()) return;

      if (
        idleTime > 10 &&
        Math.floor(Math.random() * 200) === 0 &&
        idleAnimation == null
      ) {
        const availableIdleAnimations = ["sleeping", "scratchSelf"];
        if (nekoPosX < 32) availableIdleAnimations.push("scratchWallW");
        if (nekoPosY < 32) availableIdleAnimations.push("scratchWallN");
        if (nekoPosX > window.innerWidth - 32) availableIdleAnimations.push("scratchWallE");
        if (nekoPosY > window.innerHeight - 32) availableIdleAnimations.push("scratchWallS");

        idleAnimation =
          availableIdleAnimations[Math.floor(Math.random() * availableIdleAnimations.length)];
      }

      switch (idleAnimation) {
        case "sleeping":
          if (idleAnimationFrame < 8) {
            setSprite("tired", 0);
            stopZzz();
            break;
          }
          startZzz();
          setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
          if (idleAnimationFrame > 192) {
            stopZzz();
            resetIdleAnimation();
          }
          break;
        case "scratchWallN":
        case "scratchWallS":
        case "scratchWallE":
        case "scratchWallW":
        case "scratchSelf":
          setSprite(idleAnimation, idleAnimationFrame);
          if (idleAnimationFrame > 9) resetIdleAnimation();
          break;
        default:
          setSprite("idle", 0);
          return;
      }

      idleAnimationFrame += 1;
    }

    // ── Main frame loop ─────────────────────────────────────────────────
    function tick() {
      frameCount += 1;

      if (isDragging) return;                 // user is repositioning — hold
      if (forceSleep) { sleepTick(); return; } // long-press sleep — ignore the cursor

      const diffX = nekoPosX - mousePosX;
      const diffY = nekoPosY - mousePosY;
      const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

      if (isBeingPet && distance < 200) {
        idle();
        return;
      }

      if (distance < nekoSpeed || distance < 48) {
        idle();
        return;
      }

      // Moving — clear all idle/pet state
      stopZzz();
      stopPurr();
      idleAnimation = null;
      idleAnimationFrame = 0;
      petHappiness = 0;
      isBeingPet = false;

      if (idleTime > 1) {
        setSprite("alert", 0);
        idleTime = Math.min(idleTime, 7);
        idleTime -= 1;
        return;
      }

      let direction = diffY / distance > 0.5 ? "N" : "";
      direction += diffY / distance < -0.5 ? "S" : "";
      direction += diffX / distance > 0.5 ? "W" : "";
      direction += diffX / distance < -0.5 ? "E" : "";

      setSprite(direction, frameCount);

      nekoPosX -= (diffX / distance) * nekoSpeed;
      nekoPosY -= (diffY / distance) * nekoSpeed;
      nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
      nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

      nekoEl.style.left = `${nekoPosX - 16}px`;
      nekoEl.style.top = `${nekoPosY - 16}px`;
    }

    function onAnimationFrame(timestamp) {
      if (!nekoEl.isConnected) return;
      if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
      if (timestamp - lastFrameTimestamp > 100) {
        lastFrameTimestamp = timestamp;
        tick();
      }
      animationFrameId = window.requestAnimationFrame(onAnimationFrame);
    }

    // ── DOM setup ───────────────────────────────────────────────────────
    nekoEl.id = "oneko";
    nekoEl.ariaHidden = "true";
    Object.assign(nekoEl.style, {
      width: "32px",
      height: "32px",
      position: "fixed",
      pointerEvents: "auto",          // receive drag / long-press / tap gestures
      cursor: "grab",
      touchAction: "none",            // let touch-drag work without page scroll
      userSelect: "none",
      backgroundImage:
        "url('https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif')",
      imageRendering: "pixelated",
      left: `${nekoPosX - 16}px`,
      top: `${nekoPosY - 16}px`,
      zIndex: String(Number.MAX_SAFE_INTEGER)
    });

    document.body.appendChild(nekoEl);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleClick);
    nekoEl.addEventListener("pointerdown", handlePointerDown);
    nekoEl.addEventListener("pointermove", handlePointerMove);
    nekoEl.addEventListener("pointerup", handlePointerUp);
    nekoEl.addEventListener("pointercancel", handlePointerCancel);
    animationFrameId = window.requestAnimationFrame(onAnimationFrame);

    // ── Cleanup ─────────────────────────────────────────────────────────
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleClick);
      nekoEl.removeEventListener("pointerdown", handlePointerDown);
      nekoEl.removeEventListener("pointermove", handlePointerMove);
      nekoEl.removeEventListener("pointerup", handlePointerUp);
      nekoEl.removeEventListener("pointercancel", handlePointerCancel);
      if (longPressTimer) clearTimeout(longPressTimer);
      stopZzz();
      destroyAudio();
      if (petComboTimer) clearTimeout(petComboTimer);
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      if (nekoEl.isConnected) nekoEl.remove();
      if (styleEl.isConnected) styleEl.remove();
      document.querySelectorAll(".oneko-heart, .oneko-zzz, .oneko-gift").forEach((el) => el.remove());
    };
  }

  return {
    start: () => {
      cleanup?.();
      cleanup = createOneko();
    },
    stop: () => {
      cleanup?.();
      cleanup = null;
    }
  };
};
