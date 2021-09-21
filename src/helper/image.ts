interface IPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}
export function isWhitePixel(pixel: IPixel) {
  return pixel.r === 255 && pixel.g === 255 && pixel.b === 255 && pixel.a === 255;
}
