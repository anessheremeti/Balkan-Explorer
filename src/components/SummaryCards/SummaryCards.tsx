// SummaryCards.tsx
import React, { useEffect, useState } from 'react';
import { Wallet, Car, Bed, Ticket } from 'lucide-react';
import { type Trip } from '../../hooks/itineraryService';
import { calculateBudgetWithDistance } from './calculateBudgetWithDistance';
import tripService from "../../hooks/tripService";
import { supabase } from '../../../createClient';
import {useTranslation} from 'react-i18next';
interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, iconBg, iconColor }) => (
  <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm shadow-slate-200/50 flex flex-col justify-between h-[160px] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
    <div className="flex justify-between items-start">
      <div className={`${iconBg} ${iconColor} p-2.5 rounded-xl transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">
        {title}
      </span>
    </div>
    <div>
      <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
      <p className="text-[12px] font-medium text-slate-400 mt-1">{subtitle}</p>
    </div>
  </div>
);

const SummaryCards: React.FC<{ userId: string  | null}> = ({ userId }) => {
  const { t } = useTranslation('itinerary');


  const [budgetData, setBudgetData] = useState<any>(null);
  const [latestTrip, setLatestTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchTripBudget() {
      try {
        const { getLatestTrip } = await tripService();
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData?.user?.id) {
          setError("Please log in to see your itinerary");
          return;
        }

        const userId = authData.user.id;
        const trip = await getLatestTrip(userId);

        if (trip) {
          setLatestTrip(trip);
          const budget = await calculateBudgetWithDistance(trip);
          setBudgetData(budget);
        }
      } catch (err: any) {
        setError(err.message || "Error calculating budget");
      }
    }

    fetchTripBudget();
  }, [userId]);

  if (error) return <p>{error}</p>;
  if (!budgetData || !latestTrip) return <p>Loading...</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">

      {/* Total Card */}
      <div className="bg-[#111827] rounded-3xl p-6 shadow-xl shadow-slate-200/50 flex flex-col justify-between h-40 relative overflow-hidden group transition-transform hover:-translate-y-1">
        <div className="flex justify-between items-start">
          <div className="bg-white/10 p-2.5 rounded-xl">
            <Wallet size={20} className="text-white" />
          </div>
          <span className="text-[10px] font-bold text-white/50 bg-white/5 px-2.5 py-1.5 rounded-lg uppercase tracking-wider">
            {t('est_total')}
          </span>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-white tracking-tight">
            ${budgetData.total_budget}
          </h3>
          <p className="text-[12px] font-medium text-white/40 mt-1">
            ~${budgetData.breakdown.per_traveler} per person
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
      </div>

      {/* Transport */}
      <StatCard
        title="Transport"
        value={`$${budgetData.breakdown.fuel}`}
        subtitle={t('fuel_tolls')}
        icon={<Car size={20} />}
        iconBg="bg-blue-50"
        iconColor="text-blue-500"
      />

      {/* Stay */}
      <StatCard
        title={t('stay')}
        value={`$${budgetData.breakdown.accommodation}`}
        subtitle={`${Math.ceil((new Date(latestTrip.returning_date).getTime() - new Date(latestTrip.starting_date).getTime()) / 86_400_000)} Nights`}
        icon={<Bed size={20} />}
        iconBg="bg-purple-50"
        iconColor="text-purple-500"
      />

      {/* Activities */}
      <StatCard
        title={t('activities')}
        value={`$${budgetData.breakdown.tour}`}
        subtitle={t('tours_entry')}
        icon={<Ticket size={20} />}
        iconBg="bg-orange-50"
        iconColor="text-orange-500"
      />
    </div>
  );
};

export default SummaryCards;