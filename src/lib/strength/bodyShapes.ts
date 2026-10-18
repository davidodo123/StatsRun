// Cuerpo humano para el mapa de músculos (delante y detrás), lienzo de 200 × 440.
// Solo se dibuja la mitad izquierda: la derecha es su reflejo (x → 200 - x). Lo que va unido por el centro
// (cabeza, cuello, trapecio, lumbar) lo pasa medio punto para que al reflejarlo no quede una raya.
import type { Muscle } from "./labels";

export type BodyShape = { m?: Muscle; d: string };

export const BODY_W = 200;
export const BODY_H = 440;

// partes que no son músculo (cabeza, manos, rodillas, pies): gris de fondo
const BASE: BodyShape[] = [
  { d: "M100.5 14H100C89 14 83 24 83 37C83 50 90 60 100 60H100.5Z" }, // cabeza
  { d: "M36 228C30 232 30 246 36 252C42 254 46 246 46 236C45 230 40 226 36 228Z" }, // mano
  { d: "M76 322C72 328 72 336 76 340C82 342 88 340 90 334C90 326 84 320 76 322Z" }, // rodilla
  { d: "M70 404C66 412 68 420 78 422C86 422 90 418 88 410C86 402 76 400 70 404Z" }, // pie
];

export const FRONT: BodyShape[] = [
  ...BASE,
  { m: "cuello", d: "M92 62C92 68 91 74 89 80L97 84C98 77 99 70 99 64Z" },
  { m: "trapecio", d: "M88 72C80 78 72 82 66 85C74 87 82 87 89 86Z" },
  { m: "hombros", d: "M68 87C58 87 50 94 47 104C45 112 46 120 49 126C55 118 61 111 67 106C71 101 73 95 72 89Z" },
  { m: "pecho", d: "M98 90L76 90C70 95 67 102 66 110C66 120 71 127 80 129C88 131 94 129 98 125Z" },
  { m: "biceps", d: "M51 128C46 138 44 150 45 160C46 167 50 170 55 167C60 157 63 145 63 133C61 126 56 124 51 128Z" },
  { m: "antebrazos", d: "M45 172C40 184 36 198 35 212C35 220 38 224 43 223C49 210 55 196 59 182C59 174 52 168 45 172Z" },
  // recto abdominal en bloques y oblicuo
  { m: "abdomen", d: "M97 133H86C84 133 83 135 83 137V150C83 152 85 153 87 153H97Z" },
  { m: "abdomen", d: "M97 157H87C85 157 84 158 84 160V172C84 174 85 175 87 175H97Z" },
  { m: "abdomen", d: "M97 179H88C86 179 85 180 85 182V193C85 195 86 196 88 196H97Z" },
  { m: "abdomen", d: "M97 200H89C87 200 86 202 87 204C89 210 93 214 97 216Z" },
  { m: "abdomen", d: "M80 132C73 140 70 152 70 166C70 182 73 196 80 206C82 192 82 176 81 160C81 150 81 140 80 132Z" },
  { m: "abductores", d: "M75 207C69 213 66 222 65 232C67 238 70 243 72 246C75 234 78 222 81 213Z" },
  { m: "cuadriceps", d: "M83 214C74 226 68 244 67 266C67 288 71 306 78 318C84 320 90 318 93 312C96 290 96 266 94 246C92 232 89 222 83 214Z" },
  { m: "aductores", d: "M97 220C93 230 92 246 93 262C93 270 94 276 96 280C98 266 99 248 99 230C99 225 98 222 97 220Z" },
  { m: "gemelos", d: "M70 344C64 356 63 372 67 388C70 396 75 401 81 399C86 386 89 370 89 357C88 346 80 340 70 344Z" },
];

export const BACK: BodyShape[] = [
  ...BASE,
  { m: "cuello", d: "M92 58C92 63 91 68 90 73L100.5 64V58Z" },
  { m: "trapecio", d: "M100.5 64H100L91 75C83 81 73 85 66 88C76 91 85 95 89 101C93 111 96 122 100 134H100.5Z" },
  { m: "hombros", d: "M66 90C57 90 50 96 47 105C45 113 46 120 49 126C55 118 61 112 67 107C71 103 72 97 70 92Z" },
  { m: "triceps", d: "M51 128C46 138 44 150 45 160C46 167 50 170 55 167C60 157 63 145 63 133C61 126 56 124 51 128Z" },
  { m: "antebrazos", d: "M45 172C40 184 36 198 35 212C35 220 38 224 43 223C49 210 55 196 59 182C59 174 52 168 45 172Z" },
  { m: "espalda", d: "M70 94C77 95 84 99 87 104C89 112 90 119 89 126C82 124 75 118 71 110C69 104 69 98 70 94Z" },
  { m: "dorsal", d: "M67 114C66 132 71 152 82 170C87 162 92 154 96 146C94 140 92 134 91 130C82 128 73 122 67 114Z" },
  { m: "lumbar", d: "M100.5 140H100C96 148 90 160 85 172C85 184 87 193 90 199L100.5 201Z" },
  { m: "gluteos", d: "M98 204C88 200 77 202 70 210C65 220 65 234 70 244C78 252 90 252 98 246Z" },
  { m: "abductores", d: "M74 200C70 202 67 206 66 212C70 208 74 205 79 203Z" },
  { m: "isquios", d: "M72 252C68 266 67 284 69 300C71 310 76 318 82 320C88 320 92 316 94 310C97 290 97 270 95 254C88 258 79 258 72 252Z" },
  { m: "gemelos", d: "M69 338C61 350 60 368 66 381C70 389 76 391 82 387C88 375 90 361 88 349C86 340 78 334 69 338Z" },
];

/** Refleja una forma de la mitad izquierda a la derecha. */
export const MIRROR = `translate(${BODY_W} 0) scale(-1 1)`;
