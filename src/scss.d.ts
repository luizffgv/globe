// This file contains module declarations for Sass files.

declare module "*.scss?string" {
  const string: string;
  export default string;
}

declare module "*.scss?apply";

declare module "*.scss?sheet" {
  const sheet: CSSStyleSheet;
  export default sheet;
}
