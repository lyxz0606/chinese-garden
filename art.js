const wrap=(body,cls='',viewBox='0 0 160 120')=>`<svg viewBox="${viewBox}" class="${cls}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
export function icon(name,cls='icon'){
  const common='fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const shapes={
    sound:'<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 8q4 4 0 8m3-11q7 7 0 14"/>',
    home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    book:'<path d="M3 5q5-2 9 2 4-4 9-2v15q-5-2-9 1-4-3-9-1ZM12 7v14"/>',
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back:'<path d="M20 12H5m6-6-6 6 6 6"/>',
    heart:'<path d="M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13Z"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 7 9-7"/>',
    train:'<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M7 6V3h5v3M3 12h12m0 0h5v6h-5M6 21v-3m12 3v-3"/>',
    path:'<path d="M3 18q6 3 7-3t6-7 5-5"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="4" r="2"/>',
    basket:'<path d="m3 9 3 12h12l3-12ZM7 9l5-7 5 7M9 13v4m6-4v4"/>',
    leaf:'<path d="M20 3C5 2 1 9 6 17s17 0 14-14ZM5 21 17 8"/>',
    flower:'<circle cx="12" cy="9" r="3"/><path d="M12 6c-8-8-11 6-3 5-6 9 9 9 6 1 10-1 1-12-3-6Zm0 9v7m0-2 5-3"/>',
    star:'<path d="m12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z"/>',
    replay:'<path d="M4 8a9 9 0 1 1-1 8M4 3v5h5"/>',
    parent:'<circle cx="9" cy="7" r="3"/><circle cx="18" cy="11" r="2"/><path d="M3 22v-5a6 6 0 0 1 12 0v5m0-5a4 4 0 0 1 7 3v2"/>',
    check:'<path d="m4 12 5 5L21 5"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    close:'<path d="m5 5 14 14M19 5 5 19"/>',
    help:'<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 4v.1"/>'
  };return wrap(`<g ${common}>${shapes[name]||shapes.star}</g>`,cls,'0 0 24 24');
}
export function garden(){return wrap(`
  <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#d5ecf0"/><stop offset="1" stop-color="#f1f5e8"/></linearGradient></defs>
  <rect width="560" height="340" rx="100" fill="url(#sky)"/>
  <circle cx="452" cy="66" r="31" fill="#ffdb8c"/><path d="M44 116q30-35 56 0m287 3q28-37 57 0" fill="#fff" opacity=".8"/>
  <path d="M0 277 93 154l102 99 98-145 165 170 102-81v143H0" fill="#c5dcd5"/>
  <path d="m252 167 41-59 55 80-39-17-20 14-17-28Z" fill="#f9fcf7"/>
  <path d="M0 281q136-44 250 8t310-7v58H0" fill="#a4c9ad"/>
  <path d="M248 340q-45-39 8-66t14-55" fill="none" stroke="#faf0ca" stroke-width="29"/>
  <g stroke="#567f78" stroke-width="3" stroke-linejoin="round">
    <path d="M321 122h88v137h-88Z" fill="#f7eee0"/><path d="m312 123 53-63 53 63Z" fill="#ad9ed4"/>
    <path d="M287 174h39v86h-39Zm116 0h39v86h-39Z" fill="#d9e8eb"/><path d="m279 176 27-39 27 39Zm117 0 27-39 27 39Z" fill="#92babc"/>
    <path d="M349 259v-37a17 17 0 0 1 34 0v37" fill="#a8c8bd"/><path d="M355 145q10-15 20 0v18h-20Z" fill="#ffdb8c"/>
    <path d="M366 62V36l27 11-27 8" fill="#ed9d83"/>
  </g>
  <g transform="translate(105 194)">
    <ellipse cx="37" cy="94" rx="45" ry="9" fill="#739d7b" opacity=".2"/>
    <ellipse cx="37" cy="67" rx="29" ry="33" fill="#fff9ed"/>
    <ellipse cx="22" cy="14" rx="10" ry="30" transform="rotate(-13 22 14)" fill="#fff9ed"/>
    <ellipse cx="52" cy="14" rx="10" ry="30" transform="rotate(12 52 14)" fill="#fff9ed"/>
    <ellipse cx="22" cy="12" rx="4" ry="19" transform="rotate(-13 22 12)" fill="#edc6b7"/>
    <ellipse cx="52" cy="12" rx="4" ry="19" transform="rotate(12 52 12)" fill="#edc6b7"/>
    <circle cx="37" cy="41" r="29" fill="#fff9ed"/><circle cx="27" cy="39" r="2.6" fill="#416b62"/><circle cx="48" cy="39" r="2.6" fill="#416b62"/>
    <path d="M34 48q4 5 8 0" fill="none" stroke="#416b62" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="18" cy="48" rx="6" ry="3" fill="#f1c1ad"/><ellipse cx="56" cy="48" rx="6" ry="3" fill="#f1c1ad"/>
    <path d="m13 62 26 11 25-11v27l-25 7-26-7Z" fill="#deab70"/><path d="M39 73v23" stroke="#ba824e" stroke-width="2"/>
  </g>
  <g fill="#f8e3a4"><path d="m61 265 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z"/><circle cx="481" cy="286" r="5"/><circle cx="489" cy="278" r="5"/><circle cx="497" cy="286" r="5"/></g>
  <g stroke="#497e68" stroke-width="3" fill="none"><path d="M489 286v30m0-8 12-7M45 320v-21m0 9-11-7"/></g>
  <g font-family="Andika, sans-serif" font-size="39" fill="#367d70"><text x="75" y="75" transform="rotate(-11 75 75)">a</text><text x="178" y="135" transform="rotate(10 178 135)">o</text><text x="459" y="198" transform="rotate(-9 459 198)">m</text></g>
`, 'garden-illustration','0 0 560 340');}
export function picture(id){
  const base=`<ellipse cx="80" cy="103" rx="55" ry="7" fill="#416b62" opacity=".08"/>`;
  const art={
    rice:`<ellipse cx="80" cy="58" rx="46" ry="18" fill="#fff"/><path d="M34 58q5 47 46 47t46-47" fill="#90bbc2"/><path d="M39 68q40 15 82 0" stroke="#fff" stroke-width="4" fill="none"/><g stroke="#c0bca9" stroke-width="2" stroke-linecap="round"><path d="m53 49 5 4m12-11 5 4m14-3 4 5m13 1 5 3m-35 3 5 4m10-4 5 3m-30 0 5 2"/></g>`,
    pen:`<g transform="rotate(35 80 60)"><path d="M68 18h24v66l-12 23-12-23Z" fill="#f1c76e"/><path d="M68 18h24V8H68Z" fill="#e4a299"/><path d="M68 84h24l-12 23Z" fill="#e9d8b5"/><path d="m76 100 4 7 4-7" fill="#345d53"/><path d="M74 20v64m12-64v64" stroke="#d19f49" stroke-width="2"/></g>`,
    cloth:`<path d="m35 28 85-5 14 68-83 10-17-27Z" fill="#b5a5d8"/><path d="m34 74 24 4-7 23" fill="#897db5"/><g fill="none" stroke="#e7def4" stroke-width="3"><path d="m59 27 8 64m18-65 10 63m14-63 10 62M39 44l84-5M38 60l89-6M51 79l79-10"/></g>`,
    horse:`<path d="M44 56h51l10-29 27 9-5 25-14 5-5 31h-10l-4-22H63l-5 23H47l-1-29-14 4-4-12Z" fill="#c69a70"/><path d="m106 29 1-15 12 14m-24 28 10-29-7-3-16 32" fill="#795f4d"/><circle cx="122" cy="42" r="2.7" fill="#304f46"/><path d="m42 61-14-11-12 8" fill="none" stroke="#795f4d" stroke-width="7" stroke-linecap="round"/>`,
    wood:`<path d="m34 50 70-23 27 43-67 30Z" fill="#b9895c"/><ellipse cx="50" cy="75" rx="23" ry="29" transform="rotate(-30 50 75)" fill="#e9c799"/><ellipse cx="50" cy="75" rx="15" ry="20" transform="rotate(-30 50 75)" fill="none" stroke="#bb9064" stroke-width="2"/><ellipse cx="50" cy="75" rx="7" ry="10" fill="none" stroke="#bb9064" stroke-width="2"/><path d="m62 48 45-14m-29 29 45-14m-41 29 45-16" stroke="#976d47" stroke-width="2"/>`,
    eight:Array.from({length:8},(_,i)=>{const x=35+(i%4)*30,y=36+Math.floor(i/4)*40;return `<path d="m${x} ${y-13} 4 9 10 1-8 7 3 10-9-5-9 5 3-10-8-7 10-1Z" fill="#efbc61"/>`;}).join(''),
    'rocking-horse':`<path d="M46 53h48l11-30 24 8-4 24-13 5-6 28H96l-5-19H63l-5 19H47l-2-24-13 5-4-10Z" fill="#c99f76"/><path d="m106 24 1-13 11 15m-25 27 12-29-7-3-18 33" fill="#7c6554"/><circle cx="121" cy="38" r="2.5" fill="#304f46"/><path d="M28 90q49 38 107 0" fill="none" stroke="#a87a51" stroke-width="9" stroke-linecap="round"/><path d="m69 53 20 0v17H69Z" fill="#ba9ed0"/>`
  };return wrap(base+(art[id]||art.rice),'object-art');
}
