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
