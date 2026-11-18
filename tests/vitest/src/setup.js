// jsdom does not implement canvas; return null quietly instead of logging "Not implemented".
HTMLCanvasElement.prototype.getContext = () => null
