import { Users, UserCheck, FileCheck, IndianRupee } from "lucide-react";

interface Props {
  total: number;
  active: number;
  approved: number;
  totalLoan: number;
}

const UserStatsCards = ({ total, active, approved, totalLoan }: Props) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Stat title="Total Users" value={total} icon={<Users className="text-blue-600" size={24} />} bg="bg-blue-100" />
      <Stat title="Active Users" value={active} icon={<UserCheck className="text-green-600" size={24} />} bg="bg-green-100" />
      <Stat title="Approved Loans" value={approved} icon={<FileCheck className="text-red-600" size={24} />} bg="bg-orange-100" />
      <Stat title="Total Loan Amount" value={`₹${totalLoan / 100000}L`} icon={<IndianRupee className="text-purple-600" size={24} />} bg="bg-purple-100" />
    </div>
  );
};

const Stat = ({ title, value, bg, icon }: any) => (
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

export default UserStatsCards;
