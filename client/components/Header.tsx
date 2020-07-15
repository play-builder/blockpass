import Link from "next/link";

interface HeaderProps {
  currentUser: { id: string; walletAddress: string } | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}

const Header = ({
  currentUser,
  onConnect,
  onDisconnect,
  isConnecting,
}: HeaderProps) => {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link href="/">
          <a style={styles.logo}>BlockPass</a>
        </Link>

        <nav style={styles.nav}>
          <Link href="/">
            <a style={styles.navLink}>Browse Tickets</a>
          </Link>
          {currentUser && (
            <>
              <Link href="/tickets/new">
                <a style={styles.navLink}>Sell Tickets</a>
              </Link>
              <Link href="/orders">
                <a style={styles.navLink}>My Orders</a>
              </Link>
            </>
          )}
        </nav>

        <div>
          {currentUser ? (
            <div style={styles.userInfo}>
              <span style={styles.address}>
                {formatAddress(currentUser.walletAddress)}
              </span>
              <button onClick={onDisconnect} style={styles.disconnectBtn}>
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="btn btn-primary"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    backgroundColor: "white",
    borderBottom: "1px solid #e5e7eb",
    padding: "15px 0",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#6366f1",
  },
  nav: {
    display: "flex",
    gap: "20px",
  },
  navLink: {
    color: "#4b5563",
    transition: "color 0.2s",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  address: {
    backgroundColor: "#f3f4f6",
    padding: "8px 12px",
    borderRadius: "20px",
    fontSize: "14px",
    color: "#374151",
  },
  disconnectBtn: {
    background: "none",
    border: "none",
    color: "#dc2626",
    cursor: "pointer",
    fontSize: "14px",
  },
};

export default Header;
