interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  from: string;
  to: string;
  link: string;
  createdAt: Date;
}
