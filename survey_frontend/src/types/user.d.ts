// Shape returned by GET /users/me on the survey backend.
interface CurrentUser {
  id: number;
  username: string;
  name: string;
  email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  avatar: string | null;
  // Optional fields kept for parity with the HRM/EBR user card.
  position?: string | null;
  department?: string | null;
}
