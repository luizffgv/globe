import * as three from "three";
const degToRad = three.MathUtils.degToRad;
import * as postprocessing from "postprocessing";
import { throwIfNull } from "@luizffgv/ts-conversions";
import { lerp, remap } from "Scripts/math";
import { DragHandler } from "Scripts/pointer";

type GlobeParameters = {
  /**
   * How many updates will happen in a second.
   */
  tick_rate?: number;

  /**
   * The radius of the globe.
   */
  radius?: number;

  /**
   * URL of the texture for the globe.
   */
  texture_url?: string;

  /**
   * How many revolutions the globe will make in a second.
   */
  revolutions_per_second?: number;

  /**
   * How long in seconds a wave takes to travel to the opposite point of the
   * globe.
   */
  wave_time?: number;
  /**
   * Roughly relates to the amount of waves on the globe at a given moment.
   */
  wave_multiplier?: number;
  /**
   * How far the waves will protrude and dent the surface of the globe.
   */
  wave_displacement?: number;
  /**
   * Independently enables/disables inwards and outwards displacement of a wave.
   */
  wave_displacement_types?: {
    inwards?: boolean;
    outwards?: boolean;
  };
};

export default class Globe {
  static #CAMERA_DISTANCE = 1;
  /**
   * How many updates will happen in a second.
   */
  readonly #TICK_RATE: number;

  /**
   * The radius of the globe.
   */
  readonly #RADIUS: number;
  /**
   * How many revolutions the globe will make in a second.
   */
  readonly #REVOLUTIONS_PER_SECOND: number;

  /**
   * How long in seconds a wave takes to travel to the opposite point of the
   * globe.
   */
  readonly #WAVE_TIME: number;
  /**
   * Roughly relates to the amount of waves on the globe at a given moment.
   */
  readonly #WAVE_MULTIPLIER: number;
  /**
   * How far the waves will protrude and dent the surface of the globe.
   */
  readonly #WAVE_DISPLACEMENT: number;
  /**
   * Enables/disables inwards displacement of a wave.
   */
  readonly #WAVE_DISPLACE_INWARDS: boolean;
  /**
   * Enables/disables outwards displacement of a wave.
   */
  readonly #WAVE_DISPLACE_OUTWARDS: boolean;

  readonly #scene: three.Scene;

  readonly #camera: three.OrthographicCamera;

  readonly #renderer: three.WebGLRenderer;

  readonly #composer: postprocessing.EffectComposer;

  readonly #geometry: three.BufferGeometry;

  readonly #material: three.PointsMaterial;

  readonly #globe: three.Object3D;

  readonly #element: HTMLElement;

  set textureUrl(url: string) {
    const texture = new three.TextureLoader().load(url);
    this.#material.alphaMap = texture;
  }

  /**
   * The HTML element containing the globe.
   */
  get element() {
    return this.#element;
  }

  /**
   * Creates a new globe simulation.
   *
   * @params params - Desired parameters.
   */
  constructor(params: GlobeParameters) {
    params.wave_displacement_types;

    this.#TICK_RATE = params.tick_rate ?? 30;
    this.#RADIUS = params.radius ?? 1;
    this.#REVOLUTIONS_PER_SECOND = params.revolutions_per_second ?? 0.1;
    this.#WAVE_TIME = params.wave_time ?? 0;
    this.#WAVE_MULTIPLIER = params.wave_multiplier ?? 0;
    this.#WAVE_DISPLACEMENT = params.wave_displacement ?? 0;
    this.#WAVE_DISPLACE_INWARDS =
      params.wave_displacement_types?.inwards ?? true;
    this.#WAVE_DISPLACE_OUTWARDS =
      params.wave_displacement_types?.outwards ?? true;

    this.#scene = new three.Scene();
    this.#scene.fog = new three.Fog(
      0x102028,
      Globe.#CAMERA_DISTANCE,
      Globe.#CAMERA_DISTANCE + this.#RADIUS * 1.5
    );

    this.#camera = new three.OrthographicCamera();
    this.#camera.position.setZ(this.#RADIUS + Globe.#CAMERA_DISTANCE);

    this.#renderer = new three.WebGLRenderer({ alpha: true });
    this.#element = document.createElement("div");
    this.#element.style.overflow = "hidden";
    this.#element.appendChild(this.#renderer.domElement);

    const drag = new DragHandler(this.#element);
    const onDrag = (deltaX: number, deltaY: number) => {
      this.#globe.rotateOnWorldAxis(new three.Vector3(0, 1, 0), deltaX / 500);
      this.#globe.rotateOnWorldAxis(new three.Vector3(1, 0, 0), deltaY / 500);
    };
    drag.onDrag(onDrag);

    this.#composer = new postprocessing.EffectComposer(this.#renderer);
    this.#composer.addPass(
      new postprocessing.RenderPass(this.#scene, this.#camera)
    );
    this.#composer.addPass(
      new postprocessing.EffectPass(
        this.#camera,
        new postprocessing.BloomEffect({
          intensity: 0.25,
          luminanceThreshold: 0,
        })
      )
    );

    const texture = new three.TextureLoader().load(
      params.texture_url ?? "assets/earth.png"
    );

    this.#geometry = new three.IcosahedronGeometry(this.#RADIUS, 25);
    this.#material = new three.PointsMaterial({
      color: 0x00cccc,
      size: 1,
      alphaMap: texture,
      alphaTest: 0.5,
    });
    this.#globe = new three.Points(this.#geometry, this.#material);
    this.#globe.rotateZ(degToRad(-23.5));
    this.#scene.add(this.#globe);

    const resizeObserver = new ResizeObserver((entries) =>
      this.#onResize(entries)
    );
    resizeObserver.observe(this.#element);

    setInterval(() => this.#tick(), 1000 / this.#TICK_RATE);

    const drawLoop = () => {
      requestAnimationFrame(drawLoop);
      this.#draw();
    };
    drawLoop();
  }

  /**
   * Adapts the canvas size to the current container size.
   *
   * @param entries - ResizeObserver entries used.
   * Only the first entry is considered.
   */
  #onResize(entries: ResizeObserverEntry[]) {
    const { width: WIDTH, height: HEIGHT } = throwIfNull(
      entries[0]
    ).contentRect;
    const ASPECT_RATIO = WIDTH / HEIGHT;
    const ASPECT_RATIO_INV = 1 / ASPECT_RATIO;

    this.#camera.left = -ASPECT_RATIO;
    this.#camera.right = ASPECT_RATIO;

    if (ASPECT_RATIO < 1) {
      this.#camera.scale.setX(ASPECT_RATIO_INV);
      this.#camera.scale.setY(ASPECT_RATIO_INV);
    }

    this.#camera.updateProjectionMatrix();

    this.#composer.setSize(WIDTH, HEIGHT);
  }

  /**
   * Draws the globe to the canvas.
   */
  #draw() {
    this.#composer.render();
  }

  #tick() {
    this.#globe.rotateY(
      degToRad((360 / this.#TICK_RATE) * this.#REVOLUTIONS_PER_SECOND)
    );

    const now = Date.now();
    const wave = (now % (1000 * this.#WAVE_TIME)) / 1000 / this.#WAVE_TIME;

    const positions = this.#geometry.getAttribute("position");

    for (
      let polygonIndex = 0;
      polygonIndex < positions.array.length;
      polygonIndex += 3
    ) {
      const posNormalized = new three.Vector3()
        .fromArray(positions.array.subarray(polygonIndex, polygonIndex + 3))
        .normalize();

      let protrusion = remap(
        -1,
        1,
        this.#RADIUS - this.#WAVE_DISPLACEMENT,
        this.#RADIUS + this.#WAVE_DISPLACEMENT,
        Math.sin(
          lerp(0, Math.PI * 2, (posNormalized.y + wave) % 1) *
            this.#WAVE_MULTIPLIER
        )
      );
      if (!this.#WAVE_DISPLACE_INWARDS)
        protrusion = Math.max(this.#RADIUS, protrusion);
      if (!this.#WAVE_DISPLACE_OUTWARDS)
        protrusion = Math.min(this.#RADIUS, protrusion);

      positions.array.set(
        posNormalized.multiplyScalar(protrusion).toArray(),
        polygonIndex
      );
    }

    if (this.#WAVE_DISPLACEMENT != 0) positions.needsUpdate = true;
  }
}
