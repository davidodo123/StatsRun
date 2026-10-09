// Pantallas de entrada: sin menú.
export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <main className="min-w-0 flex-1 px-4 pt-6">{children}</main>;
}
