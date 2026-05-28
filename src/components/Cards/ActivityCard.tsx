const ActivityCard = ({ time, title, description }: any) => {
  return (
    <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Time */}
      <div className="w-32 bg-gray-100 flex items-center justify-center text-sm text-gray-600">
        {time}
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
};

export default ActivityCard;