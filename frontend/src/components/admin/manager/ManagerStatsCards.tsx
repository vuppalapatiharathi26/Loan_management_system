import { Users, CheckCircle, XCircle} from "lucide-react";

interface Props {
  total: number;
  active: number;
  disabled: number;
  // pending: number;
}

const ManagerStatsCards = ({
  total,
  active,
  disabled,
  // pending,
}: Props) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Total Managers */}
      <StatCard
        title="Total Managers"
        value={total}
        icon={<Users className="text-blue-600" />}
        bg="bg-blue-100"
      />

      {/* Active Managers */}
      <StatCard
        title="Active Managers"
        value={active}
        icon={<CheckCircle className="text-green-600" />}
        bg="bg-green-100"
      />

      {/* Disabled Managers */}
      <StatCard
        title="Disabled Managers"
        value={disabled}
        icon={<XCircle className="text-orange-600" />}
        bg="bg-orange-100"
      />

      {/* Pending Requests */}
      {/* <StatCard
        title="Pending Loan Requests"
        value={pending}
        icon={<Clock className="text-blue-600" />}
        bg="bg-blue-100"
      /> */}
    </div>
  );
};

export default ManagerStatsCards;

/* Reusable Card */
const StatCard = ({title, value, icon,bg,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
}) => (
  <div className="flex justify-between items-center bg-white rounded-xl p-6 shadow-sm">
    <div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
    <div className={`p-3 rounded-lg ${bg}`}>
      {icon}
    </div>
  </div>
);
