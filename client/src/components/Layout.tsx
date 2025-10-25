import { Link, useLocation } from "wouter";
import { Youtube, History, Users, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Youtube },
    { path: "/channels", label: "Channels", icon: Users },
    { path: "/history", label: "History", icon: History },
  ];

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;
        return (
          <Link key={item.path} href={item.path}>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${
                isActive ? "bg-sidebar-accent font-semibold" : ""
              }`}
              data-testid={`link-${item.label.toLowerCase()}`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Youtube className="h-6 w-6 text-primary" />
            PM Insights
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLinks />
        </nav>
      </aside>

      {/* Mobile Header + Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-background">
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="button-menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Youtube className="h-6 w-6 text-primary" />
                  PM Insights
                </h1>
              </div>
              <nav className="p-4 space-y-2">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>

          <h1 className="text-xl font-bold md:hidden flex items-center gap-2">
            <Youtube className="h-6 w-6 text-primary" />
            PM Insights
          </h1>

          <div className="flex items-center gap-2">
            {/* Placeholder for future actions */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
