import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, CreditCard, LogOut, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';


export default function Topbar() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const role = user?.roles[0];
  const initials = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : '?';

  const hasActiveSub = useSubscriptionStore(s => s.hasActiveSub);
  const showSubCta = role === 'member' && hasActiveSub === false;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function goProfile() {
    setOpen(false);
    const isOwnerInStaffMode = role === 'owner' && pathname.startsWith('/staff');
    navigate(`/${isOwnerInStaffMode ? 'staff' : role}/profile`);
  }

  function goPayment() {
    setOpen(false);
    navigate('/member/payment-accounts');
  }

  function handleLogout() {
    setOpen(false);
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="fixed top-4 right-5 z-40 flex items-center gap-3">
      {showSubCta && (
        <button
          onClick={() => navigate('/member/subscription/setup')}
          className="rogym-btn--primary rogym-sx-ca063821"
        >
          <ShoppingBag size={13} /> Đăng ký gói tập
        </button>
      )}

      {/* Avatar button + dropdown */}
      <div ref={dropdownRef} className="rogym-sx-50666a57">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`rogym-topbar__avatar ${open ? 'is-open' : ''}`}
        >
          {initials}
        </button>

        {open && (
          <div className="rogym-sx-f10cbe0f">
            <div className="rogym-sx-3d17be38">
              <div className="rogym-sx-09581911">{initials}</div>
              <div className="rogym-sx-2cd52ab9">
                <div className="rogym-sx-ac999974">{user?.fullName}</div>
                <div className="rogym-sx-f57809e3">{user?.email}</div>
              </div>
            </div>

            <div className="rogym-sx-df676766">
              <DropdownItem icon={<User size={15} />} onClick={goProfile}>
                Hồ sơ
              </DropdownItem>
              {role === 'member' && (
                <DropdownItem icon={<CreditCard size={15} />} onClick={goPayment}>
                  Tài khoản thanh toán
                </DropdownItem>
              )}
            </div>

            <div className="rogym-sx-75f1302c">
              <DropdownItem icon={<LogOut size={15} />} onClick={handleLogout} danger>
                Đăng xuất
              </DropdownItem>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DropdownItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rogym-dropdown-item rogym-sweep ${danger ? 'is-danger' : ''}`}
    >
      {icon}
      {children}
    </button>
  );
}
