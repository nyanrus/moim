import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { Menu, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { useAuth } from "~/routes/__root";

function NavLink(props: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={props.to}
      className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#555] transition-colors hover:text-foreground [&.active]:font-bold [&.active]:text-foreground [&.active]:border-b-2 [&.active]:border-foreground [&.active]:pb-px"
    >
      {props.children}
    </Link>
  );
}

export function Header() {
  const { user, setUser, loaded } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function handleSignOut() {
    await fetch("/api/session", { method: "DELETE" });
    setUser(null);
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-foreground bg-background">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-6">
        <Link to="/" className="mr-8 flex items-center gap-2">
          <img src="/logo.webp" alt="" className="h-6 w-6 grayscale" />
          <span className="text-xl font-extrabold tracking-tight">moim</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/events"><Trans id="Events" message="Events" /></NavLink>
          <NavLink to="/places"><Trans id="Check-ins" message="Check-ins" /></NavLink>
        </nav>
        {/* Hamburger button (mobile) */}
        <button
          type="button"
          className="ml-auto md:hidden p-2 text-foreground"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={i18n._("Toggle menu")}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <div className="ml-auto hidden md:flex items-center gap-3">
          {loaded && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <Avatar size="sm">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
                      <AvatarFallback>
                        {(user.displayName || user.handle).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-[13px] text-[#555]">@{user.handle}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate({ to: "/groups/my" })}>
                    <Trans id="My Groups" message="My Groups" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/calendar" })}>
                    <Trans id="My Calendar" message="My Calendar" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                    <Trans id="Settings" message="Settings" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/groups/create" })}>
                    <Trans id="Create Group" message="Create Group" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/events/create" })}>
                    <Trans id="Create Event" message="Create Event" />
                  </DropdownMenuItem>
                  {user.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                        <Trans id="Admin Panel" message="Admin Panel" />
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <Trans id="Sign out" message="Sign out" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth/signin"><Trans id="Sign in" message="Sign in" /></Link>
              </Button>
            )
          )}
        </div>
      </div>
      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="md:hidden border-t border-foreground/20 bg-background">
          <nav className="mx-auto max-w-5xl flex flex-col px-6 py-4 gap-3">
            <Link to="/events" className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#555] hover:text-foreground" onClick={() => setMenuOpen(false)}><Trans id="Events" message="Events" /></Link>
            <Link to="/places" className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#555] hover:text-foreground" onClick={() => setMenuOpen(false)}><Trans id="Check-ins" message="Check-ins" /></Link>
            {loaded && user && (
              <>
                <hr className="border-foreground/10" />
                <span className="text-[13px] text-muted-foreground">@{user.handle}</span>
                <Link to="/groups/my" className="text-[13px] text-[#555] hover:text-foreground" onClick={() => setMenuOpen(false)}><Trans id="My Groups" message="My Groups" /></Link>
                <Link to="/calendar" className="text-[13px] text-[#555] hover:text-foreground" onClick={() => setMenuOpen(false)}><Trans id="My Calendar" message="My Calendar" /></Link>
                <Link to="/settings" className="text-[13px] text-[#555] hover:text-foreground" onClick={() => setMenuOpen(false)}><Trans id="Settings" message="Settings" /></Link>
                <hr className="border-foreground/10" />
                <Link to="/groups/create" className="text-[13px] text-[#555] hover:text-foreground" onClick={() => setMenuOpen(false)}><Trans id="Create Group" message="Create Group" /></Link>
                <Link to="/events/create" className="text-[13px] text-[#555] hover:text-foreground" onClick={() => setMenuOpen(false)}><Trans id="Create Event" message="Create Event" /></Link>
                {user.isAdmin && (
                  <>
                    <hr className="border-foreground/10" />
                    <Link to="/admin" className="text-[13px] text-[#555] hover:text-foreground" onClick={() => setMenuOpen(false)}><Trans id="Admin Panel" message="Admin Panel" /></Link>
                  </>
                )}
                <hr className="border-foreground/10" />
                <button type="button" className="text-[13px] text-[#555] hover:text-foreground text-left" onClick={() => { handleSignOut(); setMenuOpen(false); }}><Trans id="Sign out" message="Sign out" /></button>
              </>
            )}
            {loaded && !user && (
              <>
                <hr className="border-foreground/10" />
                <Link to="/auth/signin" className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#555] hover:text-foreground" onClick={() => setMenuOpen(false)}><Trans id="Sign in" message="Sign in" /></Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
