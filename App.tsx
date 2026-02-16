
import React from 'react';

export default function App() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-10 text-center">
      <h1 className="text-5xl font-extrabold text-emerald-500 tracking-tight">
        Heritage Tree
      </h1>
      <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md">
        <p className="text-xl text-slate-300 leading-relaxed mb-4">
          تبریک! برنامه با موفقیت در Vercel اجرا شد. ✅
        </p>
        <p className="text-sm text-slate-500 font-mono">
          React Version: 19.0.0
        </p>
      </div>
      <p className="text-slate-600 text-xs mt-10">
        اگر این صفحه را می‌بینید، یعنی مشکل "صفحه خالی" حل شده است.
      </p>
    </div>
  );
}
