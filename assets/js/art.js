/* ORBITAL NEXUS — artwork: illustrated destinations, an icon set for every
   catalogue entry, and the mission team that coaches you through each phase.
   Everything is inline SVG injected once as a sprite, so there are no image
   files to load and the art follows the light / dark theme. */

var ART_SPRITE = '' +
  '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>' +
  /* ---- shared gradients ---- */
  '<clipPath id="c-tile"><rect width="64" height="64" rx="14"/></clipPath>' +
  '<clipPath id="c-av"><circle cx="24" cy="24" r="22.5"/></clipPath>' +
  '<radialGradient id="g-earth" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#9fd4ff"/><stop offset=".55" stop-color="#2f7fd8"/><stop offset="1" stop-color="#0d2f6b"/></radialGradient>' +
  '<radialGradient id="g-moon" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#f1f2f5"/><stop offset=".6" stop-color="#a9adb8"/><stop offset="1" stop-color="#4c5160"/></radialGradient>' +
  '<radialGradient id="g-mars" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#ffb07a"/><stop offset=".55" stop-color="#d4622e"/><stop offset="1" stop-color="#5e1d0b"/></radialGradient>' +
  '<radialGradient id="g-venus" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#fff2c2"/><stop offset=".55" stop-color="#e6bf62"/><stop offset="1" stop-color="#7d5b16"/></radialGradient>' +
  '<radialGradient id="g-jup" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#fde3c0"/><stop offset=".6" stop-color="#d19a62"/><stop offset="1" stop-color="#6b3f1c"/></radialGradient>' +
  '<radialGradient id="g-europa" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e5dccb"/><stop offset="1" stop-color="#8c7658"/></radialGradient>' +
  '<radialGradient id="g-titan" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#ffd98a"/><stop offset=".55" stop-color="#d8913a"/><stop offset="1" stop-color="#6b3a10"/></radialGradient>' +
  '<radialGradient id="g-metal" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#f2f0ea"/><stop offset=".5" stop-color="#a8a39a"/><stop offset="1" stop-color="#3d3a35"/></radialGradient>' +
  '<linearGradient id="g-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a12"/><stop offset=".6" stop-color="#c98a3a"/><stop offset="1" stop-color="#e8b265"/></linearGradient>' +
  '<radialGradient id="g-rock" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="#cfc6b6"/><stop offset=".6" stop-color="#8a7f6e"/><stop offset="1" stop-color="#3a342b"/></radialGradient>' +
  '<radialGradient id="g-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff7d1"/><stop offset=".5" stop-color="#ffc94a"/><stop offset="1" stop-color="#ff8a1f" stop-opacity="0"/></radialGradient>' +
  '<linearGradient id="g-space" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1230"/><stop offset="1" stop-color="#1b1446"/></linearGradient>' +
  '<linearGradient id="g-marsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1d2c"/><stop offset="1" stop-color="#d98a5a"/></linearGradient>' +
  '<linearGradient id="g-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c7dff"/><stop offset="1" stop-color="#1d2f8a"/></linearGradient>' +

  /* ---- destination illustrations, 64×64 on a deep-space tile ---- */
  sym('d-leo-sso', '0 0 64 64',
    tile() + stars(4) +
    '<circle cx="32" cy="36" r="17" fill="url(#g-earth)"/>' +
    '<path d="M22 30c4-3 8-1 10 2s6 2 7-1M25 42c3 1 6-1 9 1" stroke="#5fc68a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>' +
    '<ellipse cx="32" cy="36" rx="9" ry="25" fill="none" stroke="#9ee7f2" stroke-width="1.4" stroke-dasharray="3 3" transform="rotate(-18 32 36)"/>' +
    sat(40, 13, 0.8)) +
  sym('d-geo-relay', '0 0 64 64',
    tile() + stars(5) +
    '<circle cx="32" cy="34" r="10" fill="url(#g-earth)"/>' +
    '<ellipse cx="32" cy="34" rx="26" ry="9" fill="none" stroke="#9ee7f2" stroke-width="1.4"/>' +
    sat(56, 32, 0.7) + sat(9, 37, 0.6) +
    '<path d="M47 19c4 2 6 5 7 9" stroke="#f0c24b" stroke-width="1.4" fill="none" stroke-linecap="round"/>') +
  sym('d-llo', '0 0 64 64',
    tile() + stars(5) +
    '<circle cx="30" cy="36" r="17" fill="url(#g-moon)"/>' +
    '<circle cx="24" cy="31" r="3.2" fill="#7b808d" opacity=".7"/><circle cx="35" cy="42" r="4" fill="#7b808d" opacity=".6"/><circle cx="36" cy="28" r="2" fill="#7b808d" opacity=".7"/>' +
    '<circle cx="53" cy="13" r="5" fill="url(#g-earth)"/>' +
    '<ellipse cx="30" cy="36" rx="22" ry="7" fill="none" stroke="#9ee7f2" stroke-width="1.3" stroke-dasharray="3 3"/>' +
    sat(52, 38, 0.6)) +
  sym('d-sel2', '0 0 64 64',
    tile() +
    '<circle cx="4" cy="32" r="15" fill="url(#g-sun)"/>' + stars(3) +
    '<circle cx="24" cy="32" r="4.5" fill="url(#g-earth)"/>' +
    '<path d="M28 32H44" stroke="#9fb0d0" stroke-width=".8" stroke-dasharray="2 2"/>' +
    '<ellipse cx="48" cy="32" rx="7" ry="11" fill="none" stroke="#9ee7f2" stroke-width="1.3"/>' +
    /* folded-mirror telescope */
    '<g transform="translate(48 21)"><path d="M-6 3h12l-2 4h-8z" fill="#c9a24a"/><path d="M-5 -1l5-4 5 4-5 4z" fill="#f0c24b" stroke="#a7760a" stroke-width=".5"/></g>') +
  sym('d-mars-orbit', '0 0 64 64',
    tile() + stars(5) +
    '<circle cx="30" cy="35" r="17" fill="url(#g-mars)"/>' +
    '<path d="M18 30c5-2 9 1 13-1M22 41c4 0 7-2 12 0M33 24c2 1 4 1 6 0" stroke="#8c3414" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"/>' +
    '<ellipse cx="30" cy="19.5" rx="5" ry="1.6" fill="#fff" opacity=".8"/>' +
    '<ellipse cx="30" cy="35" rx="25" ry="8" fill="none" stroke="#9ee7f2" stroke-width="1.3" stroke-dasharray="3 3" transform="rotate(-12 30 35)"/>' +
    sat(53, 26, 0.7)) +
  sym('d-mars-surface', '0 0 64 64',
    '<rect width="64" height="64" rx="14" fill="url(#g-marsky)"/>' +
    '<circle cx="48" cy="14" r="4" fill="#ffe3b3" opacity=".9"/>' +
    '<path d="M0 46c10-6 18-2 26-6s16-6 24-2 10 2 14 0V64H0z" fill="#a8471f"/>' +
    '<path d="M0 52c12-3 22 0 34-3s20-1 30 1V64H0z" fill="#7c2f12"/>' +
    /* lander */
    '<g transform="translate(26 33)"><path d="M-2 10l-5 6M14 10l5 6M6 10v6" stroke="#e6eaf2" stroke-width="1.4" stroke-linecap="round"/>' +
    '<rect x="-3" y="3" width="18" height="8" rx="2" fill="#dfe5ef"/><rect x="-12" y="5" width="9" height="4" fill="url(#g-panel)"/><rect x="15" y="5" width="9" height="4" fill="url(#g-panel)"/>' +
    '<path d="M10 3V-3" stroke="#e6eaf2" stroke-width="1.2"/><circle cx="10" cy="-4" r="2" fill="#f0c24b"/></g>') +
  sym('d-venus-orbit', '0 0 64 64',
    tile() + stars(5) +
    '<circle cx="31" cy="35" r="18" fill="url(#g-venus)"/>' +
    '<path d="M15 29c6 2 12-2 20 0s10 2 13 0M14 37c8 2 14-1 22 1s9 1 12 0M18 45c6 1 10-1 16 0" stroke="#fff8e0" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>' +
    '<ellipse cx="31" cy="35" rx="26" ry="8" fill="none" stroke="#9ee7f2" stroke-width="1.3" stroke-dasharray="3 3" transform="rotate(10 31 35)"/>' +
    sat(9, 28, 0.6)) +
  sym('d-neo', '0 0 64 64',
    tile() + stars(7) +
    '<path d="M16 36c-2-8 4-15 12-16 6-1 9 3 15 2 6-1 10 5 8 11-1 5-5 6-6 11-2 6-9 7-15 5-5-2-7-1-10-4s-3-5-4-9z" fill="url(#g-rock)"/>' +
    '<circle cx="27" cy="31" r="2.6" fill="#5a5246" opacity=".7"/><circle cx="38" cy="40" r="3.4" fill="#5a5246" opacity=".6"/><circle cx="42" cy="29" r="1.6" fill="#5a5246" opacity=".7"/>' +
    /* touch-and-go arm */
    '<g transform="translate(46 12)"><rect x="-4" y="-3" width="8" height="6" rx="1" fill="#dfe5ef"/><rect x="-11" y="-2" width="7" height="4" fill="url(#g-panel)"/><rect x="4" y="-2" width="7" height="4" fill="url(#g-panel)"/>' +
    '<path d="M0 3l-5 10" stroke="#e6eaf2" stroke-width="1.2"/></g>') +
  sym('d-europa', '0 0 64 64',
    tile() + stars(4) +
    '<circle cx="2" cy="42" r="26" fill="url(#g-jup)"/>' +
    '<path d="M-24 34h50M-24 42h52M-24 50h48" stroke="#a8693a" stroke-width="2.4" opacity=".45"/>' +
    '<ellipse cx="14" cy="47" rx="4" ry="2.4" fill="#c4543a" opacity=".7"/>' +
    '<circle cx="45" cy="24" r="11" fill="url(#g-europa)"/>' +
    '<path d="M36 20c5 2 10 0 17 3M38 28c4-1 8 2 14 0M41 16l6 15" stroke="#a5633e" stroke-width="1" fill="none" opacity=".75"/>' +
    '<path d="M45 13c0-3 1-6 0-9" stroke="#bfe8ff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>') +

  sym('d-psyche', '0 0 64 64',
    tile() + stars(9) +
    '<path d="M14 34c0-9 7-16 17-17 8-1 14 3 18 9 4 7 1 15-5 19-7 4-17 5-23 1-5-3-7-7-7-12z" fill="url(#g-metal)"/>' +
    '<circle cx="26" cy="30" r="3.2" fill="#6f6a62" opacity=".6"/><circle cx="38" cy="38" r="4.4" fill="#6f6a62" opacity=".55"/><circle cx="41" cy="27" r="1.8" fill="#6f6a62" opacity=".6"/>' +
    '<path d="M20 26c4-4 10-5 15-3" stroke="#ffffff" stroke-width="1.4" fill="none" opacity=".55" stroke-linecap="round"/>' +
    /* spacecraft with the blue glow of a Hall thruster */
    '<g transform="translate(49 12)"><path d="M-3 2l-9 7" stroke="#7ad7ff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>' +
    '<rect x="-3" y="-3" width="7" height="6" rx="1" fill="#e6eaf2"/><rect x="-11" y="-2" width="8" height="4" fill="url(#g-panel)"/><rect x="4" y="-2" width="8" height="4" fill="url(#g-panel)"/></g>') +
  sym('d-titan', '0 0 64 64',
    '<rect width="64" height="64" rx="14" fill="url(#g-haze)"/>' +
    '<circle cx="50" cy="13" r="9" fill="#f4dfb0" opacity=".35"/>' +
    '<path d="M0 46c8-5 16-5 24-2s14 4 22 0 12-3 18 0V64H0z" fill="#8a4f16"/>' +
    '<path d="M0 54c10-3 20-1 30-3s22-2 34 1V64H0z" fill="#5e3209"/>' +
    '<ellipse cx="46" cy="58" rx="12" ry="2.6" fill="#2a1a2e" opacity=".75"/>' +
    /* the rotorcraft */
    '<g transform="translate(24 26)"><rect x="-7" y="-2" width="14" height="6" rx="2" fill="#e6eaf2"/>' +
    '<path d="M-7 0h-6M7 0h6M-7 3l-4 3M7 3l4 3" stroke="#e6eaf2" stroke-width="1.2"/>' +
    '<ellipse cx="-13" cy="-1.5" rx="5" ry="1.1" fill="#9ee7f2" opacity=".85"/><ellipse cx="13" cy="-1.5" rx="5" ry="1.1" fill="#9ee7f2" opacity=".85"/>' +
    '<rect x="-2" y="-5" width="4" height="3" rx="1" fill="#f0c24b"/></g>' +
    '<path d="M24 34v8" stroke="#ffe7b0" stroke-width="1" stroke-dasharray="2 2" opacity=".7"/>') +

  /* ---- line icons, 24×24, stroke = currentColor ---- */
  ico('i-cubesat', '<rect x="7" y="6" width="10" height="12" rx="1.5"/><path d="M7 10h10M7 14h10M12 6v12M3 9h4M17 9h4"/>') +
  ico('i-smallsat', '<rect x="9" y="8" width="6" height="8" rx="1"/><path d="M9 12H2M15 12h7"/><rect x="2" y="9.5" width="5" height="5"/><rect x="17" y="9.5" width="5" height="5"/><path d="M12 8V4"/>') +
  ico('i-discovery', '<rect x="8.5" y="9" width="7" height="8" rx="1"/><path d="M8.5 13H3M15.5 13H21"/><rect x="2" y="11" width="4" height="4"/><rect x="18" y="11" width="4" height="4"/><path d="M8 6.5a4 4 0 0 1 8 0z"/><path d="M12 6.5V9"/>') +
  ico('i-newfrontiers', '<rect x="9" y="10" width="6" height="8" rx="1"/><path d="M6.5 6.5a5.5 5.5 0 0 1 11 0z"/><path d="M12 6.5V10M15 16l5 4M9 16l-4 3"/><circle cx="20.5" cy="20.5" r="1.3"/>') +
  ico('i-flagship', '<rect x="8.5" y="11" width="7" height="9" rx="1"/><path d="M5 7a7 7 0 0 1 14 0z"/><path d="M12 7v4M15.5 14H22M8.5 14H2M15 20l3 2M9 20l-3 2"/><circle cx="12" cy="3" r=".9"/>') +
  ico('i-cam', '<rect x="3" y="7" width="18" height="12" rx="2.5"/><circle cx="12" cy="13" r="3.6"/><path d="M8 7l1.5-3h5L16 7"/>') +
  ico('i-spec_vnir', '<path d="M3 18L10 5l7 13z"/><path d="M13 11.5l8-3M13.5 13l8 0M14 14.5l7.5 3"/>') +
  ico('i-spec_uv', '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>') +
  ico('i-tir', '<path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/><path d="M12 9v7"/><path d="M17 6h3M17 9h2"/>') +
  ico('i-mag', '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z"/><path d="M6 8h4M14 8h4"/>') +
  ico('i-radar', '<path d="M4 20l8-8"/><circle cx="12" cy="12" r="1.5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path d="M3 21h6"/>') +
  ico('i-msp', '<path d="M9 3h6M10 3v6l-5 10a1.5 1.5 0 0 0 1.4 2h11.2a1.5 1.5 0 0 0 1.4-2l-5-10V3"/><path d="M7.5 15h9"/>') +
  ico('i-dust', '<circle cx="6" cy="8" r="1.4"/><circle cx="12" cy="5" r="1"/><circle cx="17" cy="9" r="1.8"/><circle cx="9" cy="14" r="1.2"/><circle cx="15" cy="16" r="1"/><circle cx="6" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.1"/>') +
  ico('i-alt', '<rect x="8" y="3" width="8" height="6" rx="1"/><path d="M12 9v9M9 15l3 3 3-3M4 21h16"/>') +
  ico('i-rs', '<path d="M12 12v9M8 21h8"/><circle cx="12" cy="10" r="2"/><path d="M8 6a6 6 0 0 0 0 8M16 6a6 6 0 0 1 0 8M5 3a10 10 0 0 0 0 14M19 3a10 10 0 0 1 0 14"/>') +
  ico('i-plasma', '<path d="M2 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0 2 3 2 3"/><path d="M2 18c3-2 5-2 8 0M14 6c3-2 5-2 8 0"/>') +
  ico('i-seis', '<path d="M2 13h4l2-6 3 12 3-14 2 8h6"/>') +
  ico('i-met', '<path d="M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1.5A4 4 0 0 0 7 18z"/><path d="M3 21h9M14 21h6"/>') +
  ico('i-sampler', '<path d="M12 2v6M9 8h6l-1 9h-4z"/><path d="M10 17l2 5 2-5"/><path d="M4 21h4M16 21h4"/>') +
  ico('i-solar', '<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M3 12h18M9 7v10M15 7v10"/>') +
  ico('i-rtg', '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)"/>') +
  ico('i-battery', '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M7 10v4M11 10v4"/>') +
  ico('i-coldgas', '<path d="M8 4h4v8H8z"/><path d="M14 14c2 0 3 1 4 3M13 17c2 0 3 1 3 3M17 11c2 0 3 1 4 2"/>') +
  ico('i-mono', '<path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z"/>') +
  ico('i-biprop', '<path d="M8 3c2 4 4 6 4 9a4 4 0 0 1-8 0c0-3 2-5 4-9zM16 7c2 4 4 6 4 9a4 4 0 0 1-8 0c0-3 2-5 4-9z"/>') +
  ico('i-electric', '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>') +
  ico('i-rocket', '<path d="M12 2c4 3 5 8 4 13H8C7 10 8 5 12 2z"/><circle cx="12" cy="9" r="1.8"/><path d="M8 13l-3 4v2l3-2M16 13l3 4v2l-3-2M10 18l2 4 2-4"/>') +
  ico('i-dish', '<path d="M4 6a11 11 0 0 0 14 14z"/><path d="M11 13l6-6M17 7h-3M17 7v3M8 20h8"/>') +
  ico('i-band', '<path d="M2 12c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 3 4 4.5 0"/><path d="M21 12h1"/>') +
  ico('i-twta', '<rect x="3" y="8" width="13" height="8" rx="1.5"/><path d="M16 12h2M19 9a4 4 0 0 1 0 6M21 7a7 7 0 0 1 0 10"/>') +
  ico('i-shield', '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>') +
  ico('i-chute', '<path d="M3 11a9 9 0 0 1 18 0z"/><path d="M3 11l7 8M21 11l-7 8M12 11v8"/><rect x="10" y="19" width="4" height="3" rx=".5"/>') +
  ico('i-budget', '<circle cx="12" cy="12" r="9"/><path d="M15 9c-.5-1.2-1.7-2-3-2-1.7 0-3 .9-3 2.4C9 13 15 11 15 14.6c0 1.4-1.3 2.4-3 2.4-1.4 0-2.6-.8-3-2M12 5v2M12 17v2"/>') +
  ico('i-clock', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>') +
  ico('i-orbit3d', '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-20 12 12)"/><circle cx="20" cy="8.5" r="1.4"/>') +
  ico('i-vr', '<path d="M3 8h18v8h-6l-1.5-2.5h-3L9 16H3z"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>') +
  ico('i-play', '<path d="M7 4l13 8-13 8z"/>') +
  ico('i-pause', '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>') +
  ico('i-target', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>') +
  ico('i-console', '<rect x="2" y="4" width="20" height="12" rx="2"/><path d="M6 20h12M9 16v4M15 16v4M5 12l3-3 3 2 4-4 4 3"/>') +
  ico('i-trophy', '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5M12 14v4M8 21h8M9 18h6"/>') +
  ico('i-close', '<path d="M5 5l14 14M19 5L5 19"/>') +
  ico('i-spark', '<path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z"/>') +

  /* ---- mission team avatars, 48×48 ---- */
  avatar('a-pi', '#b98cff', '#3b2370',
    '<path d="M14 21c0-7 4-11 10-11s10 4 10 11c0 3-1 5-1 5H15s-1-2-1-5z" fill="#2b1a12"/>' + face('#f2c6a0') +
    '<path d="M17 21a7 2 0 0 0 14 0" stroke="#2b1a12" stroke-width="3" fill="none"/>' +
    '<circle cx="20.5" cy="23.5" r="2.6" fill="none" stroke="#fff" stroke-width="1"/><circle cx="27.5" cy="23.5" r="2.6" fill="none" stroke="#fff" stroke-width="1"/><path d="M23 23.5h2" stroke="#fff"/>') +
  avatar('a-sys', '#4fd1e0', '#0b4a57',
    face('#d9a37c') + '<path d="M14 19c0-6 4-9 10-9s10 3 10 9z" fill="#f0c24b"/><rect x="12" y="18" width="24" height="3" rx="1.5" fill="#e0a82a"/><path d="M24 10v8" stroke="#e0a82a" stroke-width="2"/>') +
  avatar('a-com', '#7aa2ff', '#1d2f7a',
    '<path d="M15 20c0-6 4-9 9-9s9 3 9 9v6H15z" fill="#151515"/>' + face('#c98b62') +
    '<path d="M13 25a11 11 0 0 1 22 0" stroke="#e8eefc" stroke-width="2" fill="none"/><rect x="11" y="23" width="4" height="6" rx="2" fill="#e8eefc"/><rect x="33" y="23" width="4" height="6" rx="2" fill="#e8eefc"/><path d="M15 28c0 3 3 4 6 4" stroke="#e8eefc" stroke-width="1.4" fill="none"/>') +
  avatar('a-lv', '#f0a93b', '#6b3606',
    '<path d="M14 22c0-7 4-11 10-11s10 4 10 11v8c-2-3-3-6-3-6H17s-1 3-3 6z" fill="#6b2f12"/>' + face('#f0c3a0') +
    '<path d="M16 15l16 0" stroke="#f0a93b" stroke-width="2.4"/>') +
  avatar('a-capcom', '#3ecf9a', '#0b4a35',
    '<circle cx="24" cy="23" r="12.5" fill="#f4f6fb"/><path d="M15 22a9 8 0 0 1 18 0v2a9 6 0 0 1-18 0z" fill="#1b2a52"/>' +
    '<path d="M17 20c2-3 5-4 9-3" stroke="#9ee7f2" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<rect x="21" y="33" width="6" height="3" rx="1" fill="#f0655f"/>') +
  avatar('a-fd', '#f0655f', '#6b1714',
    '<path d="M14 20c0-6 4-10 10-10s10 4 10 10l-1 3H15z" fill="#9a9aa4"/>' + face('#e3b08a') +
    '<path d="M18 30c2 2 4 2.5 6 2.5s4-.5 6-2.5" stroke="#9a9aa4" stroke-width="1.4" fill="none"/>' +
    '<path d="M12 25a12 12 0 0 1 24 0" stroke="#22252e" stroke-width="2" fill="none"/><rect x="10" y="23" width="4" height="6" rx="2" fill="#22252e"/><path d="M12 28c0 4 4 5 8 5" stroke="#22252e" stroke-width="1.4" fill="none"/>') +
  '</defs></svg>';

function sym(id, vb, body) { return '<symbol id="' + id + '" viewBox="' + vb + '"><g clip-path="url(#c-tile)">' + body + '</g></symbol>'; }
function ico(id, body) {
  return '<symbol id="' + id + '" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + body + '</g></symbol>';
}
function tile() { return '<rect width="64" height="64" rx="14" fill="url(#g-space)"/>'; }
function stars(seed) {
  var s = '', x = seed * 7.3;
  for (var i = 0; i < 9; i++) {
    x = (x * 9301 + 49297) % 233280;
    var px = (x / 233280) * 60 + 2;
    x = (x * 9301 + 49297) % 233280;
    var py = (x / 233280) * 60 + 2;
    s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + (i % 3 ? 0.5 : 0.9) + '" fill="#fff" opacity=".75"/>';
  }
  return s;
}
function sat(x, y, k) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><rect x="-3.5" y="-3" width="7" height="6" rx="1" fill="#e6eaf2"/>' +
    '<rect x="-12" y="-2" width="8" height="4" fill="url(#g-panel)" stroke="#9ee7f2" stroke-width=".4"/><rect x="4" y="-2" width="8" height="4" fill="url(#g-panel)" stroke="#9ee7f2" stroke-width=".4"/></g>';
}
function face(skin) {
  return '<path d="M14 44c1-7 5-10 10-10s9 3 10 10" fill="#e8eefc" opacity=".9"/>' +
    '<ellipse cx="24" cy="23" rx="8" ry="9" fill="' + skin + '"/>' +
    '<circle cx="21" cy="23" r="1" fill="#1a1a1a"/><circle cx="27" cy="23" r="1" fill="#1a1a1a"/>' +
    '<path d="M21.5 27.5c1.5 1.2 3.5 1.2 5 0" stroke="#7a3b2a" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
}
function avatar(id, c1, c2, body) {
  return '<symbol id="' + id + '" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="' + c2 + '"/>' +
    '<circle cx="24" cy="24" r="22.5" fill="none" stroke="' + c1 + '" stroke-width="1.5"/>' +
    '<g clip-path="url(#c-av)">' + body + '</g></symbol>';
}

/* ---------------------------------------------------------------- *
 * helpers used by the interface                                    *
 * ---------------------------------------------------------------- */
function useSvg(id, cls) {
  return '<svg class="' + (cls || 'ico') + '" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>';
}
function icon(name, cls) { return useSvg('i-' + name, cls || 'ico'); }
function destArt(id, cls) { return useSvg('d-' + id, cls || 'art'); }

/* which icon represents each catalogue entry */
var ART_MAP = {
  programs: { cubesat: 'cubesat', smallsat: 'smallsat', discovery: 'discovery', newfrontiers: 'newfrontiers', flagship: 'flagship' },
  buses: { cube6u: 'cubesat', small150: 'smallsat', med600: 'discovery', flag2200: 'flagship' }
};
function instrIcon(it) { return icon(it.tags[0]); }

/* the phase each team seat runs, in the style of JPL's concurrent
   engineering rooms (Team X), where every console owns one subsystem */
var TEAM = {
  pi: { av: 'a-pi', name: 'Dra. Lucía Vega', role: { es: 'Investigadora principal', en: 'Principal investigator' } },
  sys: { av: 'a-sys', name: 'Frank Edelin Piña Irarica', role: { es: 'Ingeniería de sistemas', en: 'Systems engineering' } },
  com: { av: 'a-com', name: 'Ing. Sofía Mamani', role: { es: 'Ingeniera de telecomunicaciones', en: 'Telecom engineer' } },
  lv: { av: 'a-lv', name: 'Ing. Valeria Cruz', role: { es: 'Directora de lanzamiento', en: 'Launch director' } },
  capcom: { av: 'a-capcom', name: 'Cap. Diego Torres', role: { es: 'Astronauta · CAPCOM', en: 'Astronaut · CAPCOM' } },
  fd: { av: 'a-fd', name: 'Ing. Andrés Salas', role: { es: 'Director de vuelo', en: 'Flight director' } }
};
var PHASE_SEAT = { 1: 'pi', 2: 'sys', 3: 'pi', 4: 'com', 5: 'lv', 6: 'capcom', 7: 'fd' };
var PHASE_ICON = { 1: 'target', 2: 'smallsat', 3: 'cam', 4: 'dish', 5: 'rocket', 6: 'console', 7: 'trophy' };

function injectArt() {
  if (document.getElementById('art-sprite')) return;
  var d = document.createElement('div');
  d.id = 'art-sprite';
  d.innerHTML = ART_SPRITE;
  document.body.insertBefore(d, document.body.firstChild);
}
