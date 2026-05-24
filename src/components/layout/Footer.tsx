import { Link } from "@tanstack/react-router";
import { Trans } from "@lingui/react";

export function Footer() {
  return (
    <footer className="border-t-2 border-foreground mt-12 bg-muted/30">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Branding & Business Info */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="" className="h-6 w-6 grayscale" />
              <span className="text-base font-extrabold tracking-tight">moim</span>
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              <Trans id="Federated events & check-ins" message="Federated events & check-ins" />
            </p>
            <div className="mt-4 space-y-1 text-[11px] text-muted-foreground/70">
              <p>상호명: 모임라이브 / 대표자: 이재열</p>
              <p>사업자등록번호: 612-33-03754</p>
              <p>주소: 서울특별시 송파구 중대로 207, 2층 201-J561호</p>
              <p>이메일: support@moim.live</p>
            </div>
          </div>

          {/* Service */}
          <div>
            <h4 className="text-[13px] font-bold mb-3"><Trans id="footer.service" message="Service" /></h4>
            <nav className="flex flex-col gap-2">
              <Link to="/events" className="text-[13px] text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"><Trans id="Events" message="Events" /></Link>
              <Link to="/places" className="text-[13px] text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"><Trans id="Check-ins" message="Check-ins" /></Link>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[13px] font-bold mb-3"><Trans id="footer.legal" message="Legal" /></h4>
            <nav className="flex flex-col gap-2">
              <Link to="/legal/terms" className="text-[13px] text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"><Trans id="Terms of Service" message="Terms of Service" /></Link>
              <Link to="/legal/privacy" className="text-[13px] text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"><Trans id="Privacy Policy" message="Privacy Policy" /></Link>
              <Link to="/legal/refund" className="text-[13px] text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"><Trans id="Refund Policy" message="Refund Policy" /></Link>
            </nav>
          </div>
        </div>
        <div className="mt-8 border-t border-foreground/10 pt-4">
          <p className="text-[11px] text-muted-foreground/50">&copy; 2026 모임라이브. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
