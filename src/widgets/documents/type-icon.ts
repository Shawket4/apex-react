import {
  Container,
  FileBadge,
  FileText,
  FlaskConical,
  Gauge,
  IdCard,
  Images,
  KeyRound,
  ScrollText,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

/**
 * A glyph per document type. Cosmetic only: a type the server adds later
 * shows the plain document glyph until it is given one here.
 */
const ICONS: Record<string, LucideIcon> = {
  national_id: IdCard,
  driving_licence: IdCard,
  safety_certificate: ShieldCheck,
  drug_test: FlaskConical,
  criminal_record: FileBadge,
  trust_receipt: ScrollText,
  site_access_pass: KeyRound,
  driver_photo: UserRound,
  vehicle_licence: FileText,
  calibration_certificate: Gauge,
  tank_licence: Container,
  vehicle_photos: Images,
};

export function documentTypeIcon(typeKey: string): LucideIcon {
  return ICONS[typeKey] ?? FileText;
}
