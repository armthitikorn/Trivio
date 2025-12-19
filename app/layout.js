import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "TRIVIO - Internal System",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0 }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}