import "./styles.scss?apply";

import Globe from "./globe";
import { trySpecify } from "@luizffgv/ts-conversions";

addEventListener("DOMContentLoaded", () => {
  const fileInput = trySpecify(
    document.getElementById("file-input"),
    HTMLInputElement
  );

  let currentFileUrl: string | null = null;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];

    if (file == null) return;

    if (currentFileUrl != null) URL.revokeObjectURL(currentFileUrl);

    currentFileUrl = URL.createObjectURL(file);

    globe.textureUrl = currentFileUrl;
  });

  const globe = new Globe({
    radius: 0.75,
    wave_displacement: 0.005,
    wave_multiplier: 8,
    wave_time: 1,
    wave_displacement_types: { inwards: true, outwards: true },
  });

  const globeElement = globe.element;
  globeElement.id = "globe";

  document.body.insertBefore(globe.element, document.body.firstChild);
});
