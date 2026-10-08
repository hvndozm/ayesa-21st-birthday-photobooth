// CSS and Canvas both derive their windows from photoboothFormats.frames.
export function framePercentageStyle(format, frame) {
  return {
    left: `${frame.x / format.canvasWidth * 100}%`,
    top: `${frame.y / format.canvasHeight * 100}%`,
    width: `${frame.width / format.canvasWidth * 100}%`,
    height: `${frame.height / format.canvasHeight * 100}%`,
  }
}
