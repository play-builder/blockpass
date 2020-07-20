import { NextPage, NextPageContext } from "next";
import buildClient from "../api/build-client";
import TicketCard from "../components/TicketCard";

interface Ticket {
  id: string;
  title: string;
  price: number;
  eventDate?: string;
  venue?: string;
  description?: string;
  isMinted: boolean;
}

interface HomePageProps {
  tickets: Ticket[];
}

const HomePage: NextPage<HomePageProps> = ({ tickets }) => {
  return (
    <div>
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Welcome to BlockPass</h1>
        <p style={styles.heroSubtitle}>
          Secure, transparent NFT-based event ticketing on Ethereum
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Available Tickets</h2>
        {tickets.length === 0 ? (
          <p style={styles.emptyText}>No tickets available at the moment.</p>
        ) : (
          <div className="grid grid-3">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

HomePage.getInitialProps = async (context: NextPageContext) => {
  const client = buildClient({ req: context.req });

  try {
    const { data } = await client.get("/api/tickets");
    return { tickets: data };
  } catch (err) {
    return { tickets: [] };
  }
};

const styles: { [key: string]: React.CSSProperties } = {
  hero: {
    textAlign: "center",
    marginBottom: "40px",
  },
  heroTitle: {
    fontSize: "36px",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "10px",
  },
  heroSubtitle: {
    fontSize: "18px",
    color: "#6b7280",
  },
  section: {
    marginBottom: "40px",
  },
  sectionTitle: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "20px",
  },
  emptyText: {
    color: "#6b7280",
    textAlign: "center",
    padding: "40px",
  },
};

export default HomePage;
