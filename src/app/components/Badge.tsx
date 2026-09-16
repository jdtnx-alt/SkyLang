import { Award, Star, Trophy, Target, Zap } from "lucide-react";

interface BadgeProps {
  type: "bronze" | "silver" | "gold" | "star" | "trophy";
  label: string;
  earned?: boolean;
}

export function Badge({ type, label, earned = true }: BadgeProps) {
  const icons = {
    bronze: <Award size={24} />,
    silver: <Star size={24} />,
    gold: <Trophy size={24} />,
    star: <Zap size={24} />,
    trophy: <Target size={24} />,
  };

  const colors = {
    bronze: "from-orange-400 to-orange-600",
    silver: "from-gray-300 to-gray-500",
    gold: "from-yellow-400 to-yellow-600",
    star: "from-purple-400 to-purple-600",
    trophy: "from-blue-400 to-blue-600",
  };

  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-xl ${earned ? "opacity-100" : "opacity-40 grayscale"}`}>
      <div
        className={`w-16 h-16 rounded-full bg-gradient-to-br ${colors[type]} flex items-center justify-center text-white shadow-lg`}
      >
        {icons[type]}
      </div>
      <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
    </div>
  );
}
