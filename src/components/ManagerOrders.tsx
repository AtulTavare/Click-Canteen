import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../lib/types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Search } from 'lucide-react';

export default function ManagerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStr, setFilterStr] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('timePlaced', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const liveOrders: Order[] = [];
      snap.forEach(d => liveOrders.push({ id: d.id, ...d.data() } as Order));
      setOrders(liveOrders);
    });
    return () => unsub();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(filterStr.toLowerCase()) || 
    o.table.toLowerCase().includes(filterStr.toLowerCase()) ||
    o.status.toLowerCase().includes(filterStr.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orders History</h1>
        
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search orders..." 
            value={filterStr}
            onChange={e => setFilterStr(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Table</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-gray-900">{o.orderNumber}</td>
                  <td className="px-6 py-4 text-gray-500">{format(o.timePlaced, 'MMM d, h:mm a')}</td>
                  <td className="px-6 py-4">{o.table}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">₹{o.totalAmount}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider inline-block",
                      o.paymentStatus === 'Paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {o.paymentMode} - {o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block border",
                      o.status === 'Placed' ? "border-blue-200 text-blue-700 bg-blue-50" :
                      o.status === 'Preparing' ? "border-amber-200 text-amber-700 bg-amber-50" :
                      o.status === 'Ready' ? "border-green-200 text-green-700 bg-green-50" :
                      "border-gray-200 text-gray-500 bg-gray-50"
                    )}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
