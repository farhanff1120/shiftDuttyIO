import { useEffect, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { useMemo } from "react";

type Shift = "P" | "S" | "M" | "X" | "C";

const SHIFT_PATTERN: Shift[] = ["P", "S", "M", "X", "X"];
const BASE_DATE = new Date(2026, 3, 1);

// GROUP SHIFT
const groups = [
  { id: 5, members: ["Rino Yasa", "Erwin Purnomo"], offset: 4 },
  {
    id: 4,
    members: ["Iqbal Faizien", "Handry Herlantik", "Pandji Reksadana"],
    offset: 0,
  },
  { id: 3, members: ["Christian", "Masadji Suwieto"], offset: 1 },
  { id: 2, members: ["Abdul Haris", "Farhan Fadhlurrohman"], offset: 2 },
  { id: 1, members: ["Andri Supriadi", "Fattah Ghani"], offset: 3 },
];

// WARNA PER ORANG
const personColors: Record<string, string> = {
  "Rino Yasa": "bg-cyan-400",
  "Erwin Purnomo": "bg-blue-200",
  "Iqbal Faizien": "bg-amber-300",
  "Handry Herlantik": "bg-orange-300",
  "Pandji Reksadana": "bg-gray-500 text-white",
  "Christian": "bg-gray-300",
  "Masadji Suwieto": "bg-yellow-600",
  "Abdul Haris": "bg-green-800 text-white",
  "Farhan Fadhlurrohman": "bg-yellow-50",
  "Andri Supriadi": "bg-red-200",
  "Fattah Ghani": "bg-green-300",

  Rahmad: "bg-red-500 text-white",
  Yoga: "bg-lime-400",
};

const extraLemburNames = ["Rahmad", "Yoga"];

type Row = {
  name: string;
  groupId: number;
  shifts: Shift[];
};

// Hari Libur
function getDayDiff(date: Date) {
  return Math.floor((date.getTime() - BASE_DATE.getTime()) / 86400000);
}
//Hari Senin-Minggu
function getHari(date: Date) {
  const days = ["M", "S", "S", "R", "K", "J", "S"];
  return days[date.getDay()];
}
//tanggal perbulan
function generateDates(year: number, month: number, holidays: string[]) {
  const lastDate = new Date(year, month, 0); // last day of month
  const days = lastDate.getDate();

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(year, month - 1, i + 1);

    return {
      day: i + 1,
      diff: getDayDiff(date),
      hari: getHari(date),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: holidays.includes(formatDate(date)),
    };
  });
}
//tanggal
function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Warna Perorang
function getRowColor(name: string) {
  return personColors[name] || "";
}
//shift n color shift
function getShift(diff: number, offset: number): Shift {
  const i = (diff + offset) % SHIFT_PATTERN.length;
  return SHIFT_PATTERN[(i + SHIFT_PATTERN.length) % SHIFT_PATTERN.length];
}
function getShiftColor(shift: Shift) {
  switch (shift) {
    case "P":
      return "bg-white";
    case "S":
      return "bg-white";
    case "M":
      return "bg-white";
    case "C":
      return "bg-blue-300";
    case "X":
      return "bg-gray-200";
    default:
      return "";
  }
}
//schedule pergroup
function generateSchedule(dates: any[]): Row[] {
  return groups.flatMap((group) =>
    group.members.map((name) => ({
      name,
      groupId: group.id,
      shifts: dates.map((d) => getShift(d.diff, group.offset)),
    })),
  );
}

{
  /* APP BODY */
}
export default function App() {
  const [month, setMonth] = useState(4);
  const [year] = useState(2026);
  const [holidays, setHolidays] = useState<string[]>([]);
  const dates = useMemo(() => {
    return generateDates(year, month, holidays);
  }, [year, month, holidays]);
  const [schedule, setSchedule] = useState<Row[]>([]);
  const [lembur, setLembur] = useState<string[][]>([]);
  const [isReady, setIsReady] = useState(false);

  {/* Load Data & Generate Schedule*/}
  useEffect(() => {
    if (!dates.length) return;

    setIsReady(false); // stop save dulu

    const key = `shiftSchedule-${year}-${month}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      const parsed = JSON.parse(saved);

      setSchedule(parsed.schedule || []);
      setLembur(parsed.lembur || []);
    } else {
      const newSchedule = generateSchedule(dates);

      const allNames = [...newSchedule.map(r => r.name), ...extraLemburNames];

      const empty = allNames.map(() =>
        Array.from({ length: dates.length }, () => "")
      );

      setSchedule(newSchedule);
      setLembur(empty);
    }

    setTimeout(() => {
      setIsReady(true); //baru boleh save
    }, 0);

  }, [month, year, dates]);

  {/* Save Data */}
  useEffect(() => {
    if (!isReady) return;
    if (!schedule.length) return;

    const key = `shiftSchedule-${year}-${month}`;

    localStorage.setItem(
      key,
      JSON.stringify({
        schedule,
        lembur,
      })
    );

  }, [schedule, lembur, isReady, month, year]);

  {/*REKAP CUTI */}
  const yearlyCuti = useMemo(() => {
    let yearly: Record<string, number> = {};

    for (let m = 1; m <= 12; m++) {
      const key = `shiftSchedule-${year}-${m}`;
      const data = localStorage.getItem(key);

      if (!data) continue;

      const parsed = JSON.parse(data);

      parsed.schedule.forEach((row: any) => {
        const totalC = row.shifts.filter((s: string) => s === "C").length;

        yearly[row.name] = (yearly[row.name] || 0) + totalC;
      });
    }

    // ✅ FIX: replace bulan aktif saja (bukan semua)
    schedule.forEach((row) => {
      const currentMonthC = row.shifts.filter((s) => s === "C").length;

      const key = `shiftSchedule-${year}-${month}`;
      const saved = localStorage.getItem(key);

      let oldMonthC = 0;

      if (saved) {
        const parsed = JSON.parse(saved);
        const found = parsed.schedule.find((r: any) => r.name === row.name);

        if (found) {
          oldMonthC = found.shifts.filter((s: string) => s === "C").length;
        }
      }

      // 👉 kurangi yang lama, tambah yang baru
      yearly[row.name] =
        (yearly[row.name] || 0) - oldMonthC + currentMonthC;
    });

    return yearly;

  }, [schedule, month]);

  {/* TGL Merah */}
  useEffect(() => {
    fetch("https://date.nager.at/api/v3/PublicHolidays/2026/ID")
      .then((res) => res.json())
      .then((data) => {
        const dates = data.map((d: any) => d.date);
        setHolidays(dates);
      })
      .catch(() => {
        console.log("Gagal fetch hari libur");
      });
  }, []);

  {/* CLICK DUTY */}
  const handleDutyClick = (rowIndex: number, dayIndex: number) => {
    const newData = schedule.map((row, i) => {
      if (i !== rowIndex) return row;

      const order: Shift[] = ["P", "S", "M", "X", "C"];
      const current = row.shifts[dayIndex];
      const next = order[(order.indexOf(current) + 1) % order.length];

      return {
        ...row,
        shifts: row.shifts.map((s, d) =>
          d === dayIndex ? next : s
        ),
      };
    }); console.log("CLICK DUTY", rowIndex, dayIndex);

    setSchedule(newData);
  }; 

  {/* CLICK LEMBUR */}
  const handleLemburClick = (rowIndex: number, dayIndex: number) => {
    const newData = lembur.map((row, i) => {
      if (i !== rowIndex) return row;

      const order = ["", "P", "S", "M"];
      const current = row[dayIndex];
      const next = order[(order.indexOf(current) + 1) % order.length];

      return row.map((val, d) =>
        d === dayIndex ? next : val
      );
    });
    

    setLembur(newData);
  };

  {/* HITUNG TOTAL DUTY*/}
  function calculateTotals(schedule: Row[], lembur: string[][], dates: any[]) {
    return dates.map((_, dayIndex) => {
      let totalP = 0;
      let totalS = 0;
      let totalM = 0;

      // hitung DUTY
      schedule.forEach((row) => {
        const shift = row.shifts[dayIndex];

        if (shift === "P") totalP++;
        if (shift === "S") totalS++;
        if (shift === "M") totalM++;
      });

      // hitung LEMBUR
      lembur.forEach((row) => {
        const val = row[dayIndex];

        if (val === "P") totalP++;
        if (val === "S") totalS++;
        if (val === "M") totalM++;
      });

      return { totalP, totalS, totalM };
    });
  }
  const totals = calculateTotals(schedule, lembur, dates);

  // EXPORT
  const exportExcel = () => {
    const allNames = [...schedule.map((r) => r.name), ...extraLemburNames];

    const data = allNames.map((name, i) => ({
      Name: name,
      ...dates.reduce((acc, d, idx) => {
        acc[`D${d.day}`] = schedule[i]?.shifts?.[idx] || "";
        acc[`L${d.day}`] = lembur[i]?.[idx] || "";
        return acc;
      }, {} as any),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");

    XLSX.writeFile(wb, `schedule-${month}.xlsx`);
  };

  const allNames = [...schedule.map((r) => r.name), ...extraLemburNames];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Schedule IO ({month}/2026)</h1>

      <div className="mb-4 flex gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border px-2 py-1"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              Bulan {i + 1}
            </option>
          ))}
        </select>

        <button
          onClick={exportExcel}
          className="bg-green-500 text-white px-3 py-1"
        >
          Export Excel
        </button>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="text-xs border-collapse w-full">
          <thead>
            {/* BARIS HARI */}
            <tr>
              <th className="border px-2 sticky left-0 bg-white border-black">
                Hari
              </th>
              {dates.map((d, i) => (
                <th
                  key={i}
                  className={`border px-1 border-black
                    ${d.isHoliday ? "bg-red-600 text-white font-bold border-black" : ""}
                    ${d.isWeekend && !d.isHoliday ? "bg-red-200 border-black" : ""}
                  `}
                >
                  {d.hari}
                </th>
              ))}
            </tr>

            {/* BARIS TANGGAL */}
            <tr>
              <th className="border px-2 sticky left-0 bg-white border-black">
                Tanggal
              </th>
              {dates.map((d) => (
                <th
                  key={d.day}
                  className={`border px-1 border-black
                    ${d.isHoliday ? "bg-red-600 text-white font-bold border-black" : ""}
                    ${d.isWeekend && !d.isHoliday ? "bg-red-200 border-black" : ""}
                  `}
                >
                  {d.day}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* DUTY */}
            {schedule.map((row, i) => (
              <tr key={row.name} className={getRowColor(row.name)}>
                <td className="border px-2 sticky left-0 border-black">
                  {row.name}
                </td>

                {row.shifts.map((s, d) => (
                  <td
                    key={d}
                    onClick={() => handleDutyClick(i, d)}
                    className={`border text-center cursor-pointer text-black border-black ${getShiftColor(s)}`}
                  >
                    {s}
                  </td>
                ))}
              </tr>
            ))}

            {/* PEMISAH */}
            <tr>
              <td
                colSpan={dates.length + 1}
                className="text-center font-bold bg-yellow-100 border py-1 border-black"
              >
                Backup On Duty
              </td>
            </tr>

            {/* LEMBUR */}
            {allNames.map((name, i) => (
              <tr key={name} className={getRowColor(name)}>
                <td className="border px-2 sticky left-0 border-black">
                  {name}
                </td>

                {dates.map((_, d) => (
                  <td
                    key={d}
                    onClick={() => handleLemburClick(i, d)}
                    className={`border text-center cursor-pointer border-black
                    ${lembur[i]?.[d] ? getRowColor(name) : "bg-white"}`}
                  >
                    {lembur[i]?.[d] || ""}
                  </td>
                ))}
              </tr>
            ))}

            {/* TOTAL DUTY */}
            <tr className="bg-gray-200 font-semibold">
              <td className="border px-2 sticky left-0 bg-gray-200 border-black">
                Total P
              </td>

              {totals.map((t, i) => (
                <td key={i} className="border text-center border-black">
                  {t.totalP}
                </td>
              ))}
            </tr>

            <tr className="bg-gray-200 font-semibold">
              <td className="border px-2 sticky left-0 bg-gray-200 border-black">
                Total S
              </td>

              {totals.map((t, i) => (
                <td key={i} className="border text-center border-black">
                  {t.totalS}
                </td>
              ))}
            </tr>

            <tr className="bg-gray-200 font-semibold">
              <td className="border px-2 sticky left-0 bg-gray-200 border-black">
                Total M
              </td>

              {totals.map((t, i) => (
                <td key={i} className="border text-center border-black">
                  {t.totalM}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="mt-6">
          <h1 className="text-xl font-bold mb-4">Rekap Cuti IO 2026</h1>
        </div>
        {/* TABLE REKAP CUTI */}
        <table className="mt-2 border w-full text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Nama</th>
              <th className="border p-2">Jatah</th>
              <th className="border p-2">Terpakai</th>
              <th className="border p-2">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row: any) => {
              const used = yearlyCuti[row.name] || 0;
              const remain = 12 - used;

              return (
                <tr key={row.name}>
                  <td className="border p-2">{row.name}</td>
                  <td className="border p-2 text-center">12</td>
                  <td className="border p-2 text-center">{used}</td>
                  <td
                    className={`border p-2 text-center ${remain < 3 ? "bg-red-200" : ""}`}
                  >
                    {remain}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
