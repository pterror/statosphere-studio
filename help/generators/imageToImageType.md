# Image-to-Image Type

The transform model to use. Values (case-sensitive, lowercase): `edit`, `canny`, `face`.

- `edit` (Qwen) — general-purpose image editing from a text prompt
- `canny` (Flux) — edge-guided generation that follows the structure of the source image
- `face` (Flux) — face-swap style transfer

**Known bug:** a typo in the current release causes this field to be ignored. All Image-to-Image generators use the `edit` model regardless of what you set here.

[Learn more →](https://pterror.github.io/statosphere-guide/reference/gotchas#the-imagetoimagetype-typo)
