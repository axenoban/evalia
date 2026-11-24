// Monograma vectorizado a partir de la referencia circular aportada por EVALIA.
export const EVALIA_MONOGRAM_PATH="M138 138H257L267 169C246 148 224 140 185 140C176 140 173 147 173 159V232H211C223 232 232 226 238 215V251C229 240 222 234 206 234H173V303C173 315 176 322 184 322H210C233 320 254 307 273 288L265 310L303 398L361 252C368 239 356 234 350 233V232H391V233C376 237 370 247 363 263L295 436L247 324H138V323C148 319 151 312 151 304V159C151 148 147 142 138 139Z M297 200C300 224 306 231 331 234C306 237 300 244 297 267C294 244 288 237 263 234C288 231 294 224 297 200Z";
export const EVALIA_MONOGRAM_COLOR="#451E3B";
export function BrandMark({className='brand-icon',variant='color'}){
 return <svg className={className} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
  <circle cx="256" cy="256" r="245" fill={variant==='black'?'#000':EVALIA_MONOGRAM_COLOR}/>
  <path d={EVALIA_MONOGRAM_PATH} fill="#fff"/>
 </svg>;
}
const icons={
 home:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 catalog:'M12 3 3 7.5 12 12 21 7.5 12 3Z M3 7.5V17L12 21 21 17V7.5 M12 12v9',
 booking:'M12 5v14 M5 12h14',
 orders:'M7 3h10l3 4v14H4V7z M4 7h16 M8 12h8 M8 16h5',
 payments:'M3 6h18v12H3z M3 10h18 M7 15h4',
 customers:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M4 21v-2a8 8 0 0 1 16 0v2',
 security:'M12 3 4 6v6c0 4 3 7 8 9 5-2 8-5 8-9V6z M9 12l2 2 4-4',
 pending:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2'
};
const legacy={'▧':'catalog','▤':'orders','⌑':'pending','▣':'payments','♧':'catalog'};
export function UiIcon({name}){
 return <svg className="ev-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={icons[legacy[name]||name]||icons.home}/></svg>;
}
