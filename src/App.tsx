import { useEffect, useState } from "react";
import * as XLSX from "xlsx-js-style";

type Shift = "P" | "S" | "M" | "X" | "C";

const SHIFT_PATTERN: Shift[] = ["P", "S", "M", "X", "X"];
const BASE_DATE = new Date(2026, 3, 1);

// GROUP SHIFT
const groups = [
  { id: 5, members: ["Rino Yasa", "Erwin Purnomo"], offset: 4 },
  { id: 4, members: ["Iqbal Faizien", "Handry Herlantik", "Pandji Reksa"], offset: 0 },
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
  "Pandji Reksa": "bg-gray-500 text-white",
  "Christian": "bg-gray-300",
  "Masadji Suwieto": "bg-yellow-600",
  "Abdul Haris": "bg-green-800 text-white",
  "Farhan Fadhlurrohman": "bg-yellow-50",
  "Andri Supriadi": "bg-red-200",
  "Fattah Ghani": "bg-green-300",

  "Rahmad": "bg-red-500 text-white",
  "Yoga": "bg-lime-400",
};

const extraLemburNames = ["Rahmad", "Yoga"];

type Row = {
  name: string;
  groupId: number;
  shifts: Shift[];
};

function getHari(date: Date) {
  const days = ["M", "S", "S", "R", "K", "J", "S"];
  return days[date.getDay()];
}



function getRowColor(name: string) {
  return personColors[name] || "";
}

function getDayDiff(date: Date) {
  return Math.floor((date.getTime() - BASE_DATE.getTime()) / 86400000);
}

function generateDates(year: number, month: number, holidays: string[]) {
  const days = new Date(year, month, 0).getDate();
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

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getShift(diff: number, offset: number): Shift {
  const i = (diff + offset) % SHIFT_PATTERN.length;
  return SHIFT_PATTERN[(i + SHIFT_PATTERN.length) % SHIFT_PATTERN.length];
}

function generateSchedule(dates: any[]): Row[] {
  return groups.flatMap(group =>
    group.members.map(name => ({
      name,
      groupId: group.id,
      shifts: dates.map(d => getShift(d.diff, group.offset)),
    }))
  );
}

function getShiftColor(shift: Shift) {
  switch (shift) {
    case "P": return "bg-white";
    case "S": return "bg-white";
    case "M": return "bg-white";
    case "C": return "bg-blue-300";
    case "X": return "bg-gray-200";
    default: return "";
  }
}

export default function App() {
  const [month, setMonth] = useState(4);
  const year = 2026;
  const [holidays, setHolidays] = useState<string[]>([]);
  const dates = generateDates(year, month, holidays);
  const [schedule, setSchedule] = useState<Row[]>([]);
  const [lembur, setLembur] = useState<string[][]>([]);
  

//Tanggal Merah
  useEffect(() => {
    fetch("https://date.nager.at/api/v3/PublicHolidays/2026/ID")
      .then(res => res.json())
      .then(data => {
        const dates = data.map((d: any) => d.date);
        setHolidays(dates);
      })
      .catch(() => {
        console.log("Gagal fetch hari libur");
      });
  }, []);

  useEffect(() => {
    const newSchedule = generateSchedule(dates);
    setSchedule(newSchedule);

    const allNames = [
      ...newSchedule.map(r => r.name),
      ...extraLemburNames,
    ];

    const empty = allNames.map(() =>
      Array.from({ length: dates.length }, () => "")
    );

    setLembur(empty);
  }, [month]);

  // CLICK DUTY
  const handleDutyClick = (rowIndex: number, dayIndex: number) => {
    const newData = [...schedule];
    const row = newData[rowIndex];

    const order: Shift[] = ["P", "S", "M", "X", "C"];
    const current = row.shifts[dayIndex];

    const next = order[(order.indexOf(current) + 1) % order.length];

    row.shifts[dayIndex] = next;

    setSchedule(newData);
  };

  // CLICK LEMBUR
  const handleLemburClick = (rowIndex: number, dayIndex: number) => {
    const newData = [...lembur];
    const current = newData[rowIndex][dayIndex];

    const order = ["", "P", "S", "M"];
    const next = order[(order.indexOf(current) + 1) % order.length];

    newData[rowIndex][dayIndex] = next;
    setLembur(newData);
  };

  // Total Duty Harian
  function calculateTotals(
    schedule: Row[],
    lembur: string[][],
    dates: any[]
  ) {
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
    const wb = XLSX.utils.book_new();

    const allNames = [
      ...schedule.map(r => r.name),
      ...extraLemburNames,
    ];

    const wsData: any[][] = [];

    // HEADER HARI
    wsData.push([
      "Hari",
      ...dates.map(d => d.hari)
    ]);

    // HEADER TANGGAL
    wsData.push([
      "Tanggal",
      ...dates.map(d => d.day)
    ]);

    // DUTY
    schedule.forEach((row) => {
      wsData.push([
        row.name,
        ...row.shifts
      ]);
    });

    // PEMISAH
    wsData.push(["Backup On Duty", ...Array(dates.length).fill("")]);

    // LEMBUR
    allNames.forEach((name, i) => {
      wsData.push([
        name,
        ...dates.map((_, d) => lembur[i]?.[d] || "")
      ]);
    });

    // TOTAL
    wsData.push([
      "Total P",
      ...totals.map(t => t.totalP)
    ]);

    wsData.push([
      "Total S",
      ...totals.map(t => t.totalS)
    ]);

    wsData.push([
      "Total M",
      ...totals.map(t => t.totalM)
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 🎨 STYLE
    const range = XLSX.utils.decode_range(ws["!ref"] || "");

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });

        if (!ws[cellRef]) continue;

        const cell = ws[cellRef];

        // default border
        cell.s = {
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
          }
        };

        // HEADER
        if (R === 0 || R === 1) {
          cell.s.fill = {
            fgColor: { rgb: "DDDDDD" }
          };
        }

        // PEMISAH
        if (cell.v === "Backup On Duty") {
          cell.s.fill = {
            fgColor: { rgb: "FFD966" }
          };
        }

        // TOTAL
        if (
          cell.v === "Total P" ||
          cell.v === "Total S" ||
          cell.v === "Total M"
        ) {
          cell.s.fill = {
            fgColor: { rgb: "CCCCCC" }
          };
        }

        // WEEKEND / HOLIDAY
        if (C > 0 && dates[C - 1]) {
          if (dates[C - 1].isHoliday) {
            cell.s.fill = {
              fgColor: { rgb: "FF4D4D" }
            };
          } else if (dates[C - 1].isWeekend) {
            cell.s.fill = {
              fgColor: { rgb: "FFCCCC" }
            };
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    XLSX.writeFile(wb, `schedule-${month}.xlsx`);
  };

  const allNames = [
    ...schedule.map(r => r.name),
    ...extraLemburNames,
  ];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">
        Schedule IO ({month}/2026)
      </h1>

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
              <th className="border px-2 sticky left-0 bg-white border-black">Hari</th>
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
              <th className="border px-2 sticky left-0 bg-white border-black">Tanggal</th>
              {dates.map(d => (
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
      </div>
    </div>
  );
}