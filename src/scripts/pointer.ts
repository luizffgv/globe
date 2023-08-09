import { throwIfNull } from "@luizffgv/ts-conversions";

/**
 * Handles mouse and touch drags.
 */
export class DragHandler {
  #dragging: boolean = false;

  #previousTouch: Touch | null = null;

  /**
   * Creates a new {@link DragHandler}.
   *
   * @param element - Element to listen for drags.
   */
  constructor(element: HTMLElement) {
    element.addEventListener("mousedown", (event) => {
      if (event.button == 0) this.#onDown(event);
    });
    element.addEventListener("touchstart", (event) => {
      this.#previousTouch = throwIfNull(event.touches[0]);

      this.#onDown(event);
    });

    addEventListener("mouseup", (event) => {
      this.#onUp(event);
    });
    addEventListener("touchend", (event) => {
      this.#onUp(event);
    });
  }

  #onDown(event: Event) {
    event.preventDefault();

    this.#dragging = true;
  }

  #onUp(event: Event) {
    if (this.#dragging) event.preventDefault();

    this.#dragging = false;
  }

  /**
   * Sets a callback to be called whenever there are drag motions.
   *
   * @param callback - Callback to be called. It receives the X movement as `x`
   * and the Y movement as `y`.
   */
  onDrag(callback: (x: number, y: number) => void) {
    addEventListener("mousemove", (event) => {
      if (this.#dragging) callback(event.movementX, event.movementY);
    });

    addEventListener("touchmove", (event) => {
      if (!this.#dragging) return;

      const touch = throwIfNull(event.targetTouches[0]);

      if (this.#previousTouch != null) {
        const deltaX = touch.pageX - this.#previousTouch.pageX;
        const deltaY = touch.pageY - this.#previousTouch.pageY;

        callback(deltaX, deltaY);
      }

      this.#previousTouch = touch;
    });
  }
}
