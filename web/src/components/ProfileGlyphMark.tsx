import { profileInitials, type ProfileGlyph } from "../lib/profiles"
import Icon from "./Icon"

export function ProfileGlyphMark({ name, glyph, image, size = 15 }: { name: string; glyph: ProfileGlyph; image?: string; size?: number }) {
  if (glyph === "image") return <img src={image} alt="" />
  return glyph === "initials" ? <>{profileInitials(name) || "?"}</> : <Icon name={glyph} size={size} />
}
