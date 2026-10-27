import { getContent } from "@/content";
import {
  previewImage,
  previewImageContentType,
  previewImageSize,
} from "@/components/preview-image";

const home = getContent().home();

export const alt = `${home.person.name} – ${home.headline.title}`;
export const size = previewImageSize;
export const contentType = previewImageContentType;

export default function Image() {
  return previewImage({
    kicker: home.person.name,
    heading: home.headline.title,
    detail: home.headline.pitch,
    tone: "muted",
  });
}
