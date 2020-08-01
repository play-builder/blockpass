import { useState, useEffect } from "react";
import { NextPage, NextPageContext } from "next";
import Router from "next/router";
import { ethers } from "ethers";
import buildClient from "../../api/build-client";

interface Order {
  id: string;
  status: string;
  expiresAt: string;
  ticket: {
    id: string;
    title: string;
    price: number;
    venue?: string;
    eventDate?: string;
  };
}

interface OrderShowProps {
  order: Order;
  currentUser: { id: string; walletAddress: string } | null;
}

const PAYMENT_ESCROW_ABI = [
  "function createPayment(bytes32 orderId, address seller) external payable returns (bytes32)",
];

const OrderShow: NextPage<OrderShowProps> = ({ order, currentUser }) => {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (order.status === "created") {
      const interval = setInterval(() => {
        const remaining = new Date(order.expiresAt).getTime() - Date.now();
        setTimeLeft(Math.max(0, remaining));
        if (remaining <= 0) {
          Router.reload();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [order]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePayment = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask");
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const escrowAddress = process.env.NEXT_PUBLIC_PAYMENT_ESCROW_ADDRESS;
      if (!escrowAddress) {
        throw new Error("Payment escrow address not configured");
      }

      const contract = new ethers.Contract(
        escrowAddress,
        PAYMENT_ESCROW_ABI,
        signer
      );

      const orderIdBytes = ethers.utils.formatBytes32String(order.id.slice(0, 31));
      const priceInWei = ethers.utils.parseEther(order.ticket.price.toString());

      const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET || ethers.constants.AddressZero;

      const tx = await contract.createPayment(orderIdBytes, platformWallet, {
        value: priceInWei,
      });

      await tx.wait();
      Router.reload();
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    try {
      const client = buildClient();
      await client.delete(`/api/orders/${order.id}`);
      Router.push("/orders");
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.[0]?.message || "Failed to cancel order"
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return "badge-green";
      case "cancelled":
        return "badge-red";
      default:
        return "badge-yellow";
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Order Details</h1>

      <div className="card" style={styles.card}>
        {order.status === "created" && timeLeft > 0 && (
          <div style={styles.timerBox}>
            <p>Time remaining to complete payment: <strong>{formatTime(timeLeft)}</strong></p>
          </div>
        )}

        <div style={styles.ticketInfo}>
          <h2 style={styles.ticketTitle}>{order.ticket.title}</h2>
          {order.ticket.venue && <p style={styles.venue}>📍 {order.ticket.venue}</p>}
          {order.ticket.eventDate && (
            <p style={styles.date}>
              📅 {new Date(order.ticket.eventDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div style={styles.statusRow}>
          <span>Status</span>
          <span className={`badge ${getStatusBadge(order.status)}`}>
            {order.status}
          </span>
        </div>

        <div style={styles.priceRow}>
          <span>Total</span>
          <span style={styles.price}>{order.ticket.price} ETH</span>
        </div>

        {error && <p className="error" style={{ marginBottom: "20px" }}>{error}</p>}

        {order.status === "created" && (
          <div style={styles.actions}>
            <button
              onClick={handlePayment}
              disabled={paying || timeLeft <= 0}
              className="btn btn-primary"
              style={styles.payBtn}
            >
              {paying ? "Processing Payment..." : "Pay with MetaMask"}
            </button>
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
              style={styles.cancelBtn}
            >
              Cancel Order
            </button>
          </div>
        )}

        {order.status === "complete" && (
          <div style={styles.successBox}>
            <p>✅ Payment successful! Your NFT ticket will be minted shortly.</p>
          </div>
        )}

        {order.status === "cancelled" && (
          <div style={styles.cancelledBox}>
            <p>❌ This order has been cancelled.</p>
          </div>
        )}
      </div>
    </div>
  );
};

OrderShow.getInitialProps = async (context: NextPageContext) => {
  const { orderId } = context.query;
  const client = buildClient({ req: context.req });

  const { data } = await client.get(`/api/orders/${orderId}`);

  return { order: data };
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
  },
  pageTitle: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "30px",
  },
  card: {
    padding: "30px",
  },
  timerBox: {
    backgroundColor: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "25px",
    color: "#92400e",
  },
  ticketInfo: {
    marginBottom: "25px",
  },
  ticketTitle: {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "10px",
  },
  venue: {
    color: "#6b7280",
    marginBottom: "5px",
  },
  date: {
    color: "#6b7280",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #e5e7eb",
    borderBottom: "1px solid #e5e7eb",
    padding: "15px 0",
    marginBottom: "15px",
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },
  price: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#6366f1",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  payBtn: {
    padding: "15px",
    fontSize: "16px",
  },
  cancelBtn: {
    padding: "15px",
    fontSize: "16px",
  },
  successBox: {
    backgroundColor: "#d1fae5",
    border: "1px solid #6ee7b7",
    borderRadius: "8px",
    padding: "15px",
    color: "#065f46",
  },
  cancelledBox: {
    backgroundColor: "#fee2e2",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    padding: "15px",
    color: "#991b1b",
  },
};

export default OrderShow;
