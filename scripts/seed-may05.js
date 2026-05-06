require('dotenv').config();
const { connectFabric, mergeFinancialData } = require('../db/fabric');

const YEAR = 2026, MONTH = 5, DAY = 5;

const data = {
  current_estimate: [
    { entity: 'Truck-Lite US',    jan: 14100000,  feb: 15200000,  mar: 17100000,  apr: 17000000,  may: 17000000  },
    { entity: 'Eliminations',     jan: -426000,   feb: -559000,   mar: -605000,   apr: -378000,   may: -363000   },
    { entity: 'Davco',            jan: 5800000,   feb: 6100000,   mar: 6100000,   apr: 7400000,   may: 7700000   },
    { entity: 'Davco Electronics',jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 300000    },
    { entity: 'Rigid',            jan: 3100000,   feb: 3700000,   mar: 3653000,   apr: 3837000,   may: 4070000   },
    { entity: 'Mexico',           jan: 5403215,   feb: 5739208,   mar: 5845872,   apr: 6472972,   may: 6558000   },
    { entity: 'Rigid/Mex Elim',   jan: -1154597,  feb: -1578695,  mar: -1550987,  apr: -1664000,  may: -1325632  },
    { entity: 'Lumitec',          jan: 2400000,   feb: 2600000,   mar: 3400000,   apr: 3000000,   may: 3065000   },
    { entity: 'Harlow',           jan: 3223939,   feb: 3512124,   mar: 4101281,   apr: 4904104,   may: 3514831   },
    { entity: 'Durite',           jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'ESG ECCO',         jan: 8593000,   feb: 8242000,   mar: 9097000,   apr: 9791000,   may: 8606000   },
    { entity: 'ESG Code3',        jan: 2653000,   feb: 2653000,   mar: 2675000,   apr: 2600000,   may: 2998000   },
    { entity: 'ESG UK & Durite',  jan: 8394943,   feb: 7465641,   mar: 8262581,   apr: 7349437,   may: 7482000   },
    { entity: 'ESG France',       jan: 781218,    feb: 711859,    mar: 765272,    apr: 667311,    may: 725000    },
    { entity: 'ESG Germany',      jan: 812889,    feb: 1059511,   mar: 1016124,   apr: 1040116,   may: 1066000   },
    { entity: 'Australia',        jan: 3556376,   feb: 4711858,   mar: 4346429,   apr: 4547525,   may: 4601000   },
    { entity: 'China',            jan: 1202173,   feb: 951850,    mar: 1018522,   apr: 1143060,   may: 922000    },
    { entity: 'Americas Elim',    jan: -1365000,  feb: -1287000,  mar: -1561000,  apr: -1530000,  may: -1577000  },
    { entity: 'Elkhart Brass',    jan: 6900000,   feb: 7285000,   mar: 7750000,   apr: 8000000,   may: 8000000   },
    { entity: 'FRC',              jan: 4900000,   feb: 5040000,   mar: 5550000,   apr: 5658000,   may: 5200000   },
    { entity: 'Shutters',         jan: 1927000,   feb: 2102000,   mar: 2470000,   apr: 2580000,   may: 2002000   },
    { entity: 'KERR Industries',  jan: 4300000,   feb: 4535000,   mar: 4960000,   apr: 4810000,   may: 4967000   },
    { entity: 'ROM T&T',          jan: 3000000,   feb: 3648000,   mar: 3700000,   apr: 4300000,   may: 3500000   },
    { entity: 'Randall',          jan: 730000,    feb: 900000,    mar: 1300000,   apr: 1250000,   may: 1429000   },
    { entity: 'Prime Design',     jan: 3500000,   feb: 3500000,   mar: 4400000,   apr: 4500000,   may: 5000000   },
    { entity: 'WT Elim',          jan: -785000,   feb: -750000,   mar: -970000,   apr: -680000,   may: -575000   },
    { entity: 'AmVan',            jan: 4500000,   feb: 4300000,   mar: 4550000,   apr: 4200000,   may: 4350000   },
    { entity: 'Roll-Rite',        jan: 4090000,   feb: 3700000,   mar: 4986000,   apr: 4379000,   may: 4012000   },
    { entity: 'Vango',            jan: 826000,    feb: 1008000,   mar: 1015000,   apr: 1100000,   may: 800000    },
    { entity: 'RVS',              jan: 1900000,   feb: 2400000,   mar: 2400000,   apr: 2435000,   may: 2500000   },
    { entity: 'AMFS',             jan: 490000,    feb: 400000,    mar: 125000,    apr: 140000,    may: 160000    },
    { entity: 'Total Ranger',     jan: 9623769,   feb: 9777276,   mar: 8981290,   apr: 10337557,  may: 9625000   },
    { entity: 'PSI',              jan: 2894683,   feb: 3735053,   mar: 3936000,   apr: 4459000,   may: 4516000   },
    { entity: 'TST',              jan: 290593,    feb: 0,         mar: 364000,    apr: 581000,    may: 588000    },
    { entity: 'SMI',              jan: 5900000,   feb: 5900000,   mar: 6100000,   apr: 6619000,   may: 6600000   },
    { entity: 'SFM',              jan: 2250000,   feb: 2141000,   mar: 2325000,   apr: 2577000,   may: 2500000   },
    { entity: 'SEON',             jan: 6320000,   feb: 7258000,   mar: 6700000,   apr: 7554000,   may: 8995000   },
    { entity: 'FLM',              jan: 263000,    feb: 358000,    mar: 371000,    apr: 289000,    may: 360000    },
    { entity: 'COBAN',            jan: 2197696,   feb: 2105762,   mar: 2131000,   apr: 2022000,   may: 2012000   },
    { entity: 'Road Ready',       jan: 673000,    feb: 700000,    mar: 718000,    apr: 650000,    may: 620000    },
  ],

  past_due_31plus: [
    { entity: 'Truck-Lite US',    jan: 1647298,   feb: 1391208,   mar: 1593937,   apr: 1425274,   may: 1425274   },
    { entity: 'Eliminations',     jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'Davco',            jan: 29365,     feb: -25916,    mar: 280779,    apr: 74656,     may: 74656     },
    { entity: 'Davco Electronics',jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'Rigid',            jan: -124,      feb: -9068,     mar: -9481,     apr: -613,      may: -613      },
    { entity: 'Mexico',           jan: 11233,     feb: 11279,     mar: 0,         apr: 0,         may: 0         },
    { entity: 'Rigid/Mex Elim',   jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'Lumitec',          jan: -32105,    feb: -15824,    mar: -33720,    apr: -1321,     may: -1321     },
    { entity: 'Harlow',           jan: 152155,    feb: 156301,    mar: 58668,     apr: 66444,     may: 66444     },
    { entity: 'Durite',           jan: 58943,     feb: 100138,    mar: -20237,    apr: -6581,     may: -6581     },
    { entity: 'ESG ECCO',         jan: 998125,    feb: 617192,    mar: 629416,    apr: 806873,    may: 806873    },
    { entity: 'ESG Code3',        jan: 496238,    feb: 491132,    mar: 385056,    apr: 579305,    may: 579305    },
    { entity: 'ESG UK & Durite',  jan: 154044,    feb: 202796,    mar: 301398,    apr: 308581,    may: 308581    },
    { entity: 'ESG France',       jan: 398362,    feb: 25800,     mar: 12891,     apr: 8742,      may: 8742      },
    { entity: 'ESG Germany',      jan: 7094,      feb: 9375,      mar: 2366,      apr: 5960,      may: 5960      },
    { entity: 'Australia',        jan: 81514,     feb: 58978,     mar: 51833,     apr: 45838,     may: 45838     },
    { entity: 'China',            jan: 3708,      feb: 7096,      mar: 13130,     apr: 9908,      may: 9908      },
    { entity: 'Americas Elim',    jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'Elkhart Brass',    jan: 330320,    feb: 302704,    mar: 539554,    apr: 160106,    may: 160106    },
    { entity: 'FRC',              jan: -63512,    feb: -87351,    mar: 73091,     apr: 56823,     may: 56823     },
    { entity: 'Shutters',         jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'KERR Industries',  jan: 658873,    feb: 350716,    mar: 354302,    apr: 246620,    may: 246620    },
    { entity: 'ROM T&T',          jan: 101327,    feb: 82983,     mar: 110932,    apr: 352312,    may: 352312    },
    { entity: 'Randall',          jan: 281533,    feb: 171192,    mar: 105048,    apr: 213356,    may: 213356    },
    { entity: 'Prime Design',     jan: 11772,     feb: -125838,   mar: 15206,     apr: -97589,    may: -97589    },
    { entity: 'WT Elim',          jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'AmVan',            jan: 20662,     feb: 3009,      mar: -28269,    apr: -44904,    may: -44904    },
    { entity: 'Roll-Rite',        jan: 211958,    feb: 275915,    mar: 84911,     apr: 87362,     may: 87362     },
    { entity: 'Vango',            jan: 62145,     feb: 34891,     mar: 26307,     apr: -37618,    may: -37618    },
    { entity: 'RVS',              jan: 219465,    feb: 186959,    mar: 86923,     apr: 73234,     may: 73234     },
    { entity: 'AMFS',             jan: 37518,     feb: 43401,     mar: 57280,     apr: 64726,     may: 64726     },
    { entity: 'Total Ranger',     jan: 300066,    feb: 1178365,   mar: 1250846,   apr: 1268755,   may: 1268755   },
    { entity: 'PSI',              jan: 214867,    feb: 183790,    mar: 196245,    apr: 54430,     may: 54430     },
    { entity: 'TST',              jan: 44820,     feb: 31975,     mar: 35200,     apr: 35900,     may: 35900     },
    { entity: 'SMI',              jan: 1004570,   feb: 1272731,   mar: 1031055,   apr: 833611,    may: 833611    },
    { entity: 'SFM',              jan: 364692,    feb: 449136,    mar: 531280,    apr: 307511,    may: 307511    },
    { entity: 'SEON',             jan: 1999324,   feb: 2933579,   mar: 2139293,   apr: 800783,    may: 800783    },
    { entity: 'FLM',              jan: 180328,    feb: 151224,    mar: 72638,     apr: 85978,     may: 85978     },
    { entity: 'COBAN',            jan: 191686,    feb: 506726,    mar: 455533,    apr: 234136,    may: 234136    },
    { entity: 'Road Ready',       jan: 145658,    feb: 134861,    mar: 156668,    apr: 125100,    may: 125100    },
  ],

  total_past_due: [
    { entity: 'Truck-Lite US',    jan: 3990561,   feb: 3696496,   mar: 4611712,   apr: 4177272,   may: 4177272   },
    { entity: 'Eliminations',     jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'Davco',            jan: 1332841,   feb: 502433,    mar: 959489,    apr: 461132,    may: 461132    },
    { entity: 'Davco Electronics',jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'Rigid',            jan: 61582,     feb: 90431,     mar: 50778,     apr: 82463,     may: 82463     },
    { entity: 'Mexico',           jan: 11233,     feb: 13356,     mar: 0,         apr: 10078,     may: 10078     },
    { entity: 'Rigid/Mex Elim',   jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'Lumitec',          jan: 52769,     feb: 296496,    mar: 272967,    apr: 322022,    may: 322022    },
    { entity: 'Harlow',           jan: 401162,    feb: 301503,    mar: 250988,    apr: 231844,    may: 231844    },
    { entity: 'Durite',           jan: 124832,    feb: 24737,     mar: -48220,    apr: -222387,   may: -222387   },
    { entity: 'ESG ECCO',         jan: 1952855,   feb: 1575146,   mar: 2201106,   apr: 2518223,   may: 2518223   },
    { entity: 'ESG Code3',        jan: 1600178,   feb: 1143081,   mar: 1411321,   apr: 1366272,   may: 1366272   },
    { entity: 'ESG UK & Durite',  jan: 472380,    feb: 578217,    mar: 955054,    apr: 1304991,   may: 1304991   },
    { entity: 'ESG France',       jan: 573242,    feb: 86060,     mar: 201524,    apr: 85389,     may: 85389     },
    { entity: 'ESG Germany',      jan: 55267,     feb: 74073,     mar: 53360,     apr: 67235,     may: 67235     },
    { entity: 'Australia',        jan: 330137,    feb: 229293,    mar: 156457,    apr: 247082,    may: 247082    },
    { entity: 'China',            jan: 38209,     feb: 59156,     mar: 48295,     apr: 93758,     may: 93758     },
    { entity: 'Americas Elim',    jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'Elkhart Brass',    jan: 1685374,   feb: 1957252,   mar: 1368464,   apr: 1091462,   may: 1091462   },
    { entity: 'FRC',              jan: 752375,    feb: 426271,    mar: 735882,    apr: 565440,    may: 565440    },
    { entity: 'Shutters',         jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'KERR Industries',  jan: 1399445,   feb: 1889947,   mar: 1153032,   apr: 855665,    may: 855665    },
    { entity: 'ROM T&T',          jan: 1399638,   feb: 1121220,   mar: 1636286,   apr: 1571603,   may: 1571603   },
    { entity: 'Randall',          jan: 593138,    feb: 473249,    mar: 629572,    apr: 657091,    may: 657091    },
    { entity: 'Prime Design',     jan: 473614,    feb: 784504,    mar: 1020565,   apr: 654624,    may: 654624    },
    { entity: 'WT Elim',          jan: 0,         feb: 0,         mar: 0,         apr: 0,         may: 0         },
    { entity: 'AmVan',            jan: 120660,    feb: 493861,    mar: 315005,    apr: 148396,    may: 148396    },
    { entity: 'Roll-Rite',        jan: 1578526,   feb: 1271395,   mar: 1012028,   apr: 1240012,   may: 1240012   },
    { entity: 'Vango',            jan: 349850,    feb: 428777,    mar: 150460,    apr: 356127,    may: 356127    },
    { entity: 'RVS',              jan: 728057,    feb: 679226,    mar: 435601,    apr: 799835,    may: 799835    },
    { entity: 'AMFS',             jan: 81711,     feb: 70371,     mar: 74560,     apr: 86259,     may: 86259     },
    { entity: 'Total Ranger',     jan: 2133788,   feb: 3907210,   mar: 4075606,   apr: 4087573,   may: 4087573   },
    { entity: 'PSI',              jan: 772675,    feb: 275657,    mar: 219273,    apr: 52985,     may: 52985     },
    { entity: 'TST',              jan: 45086,     feb: 37055,     mar: 117999,    apr: 48898,     may: 48898     },
    { entity: 'SMI',              jan: 2018340,   feb: 1911994,   mar: 1900110,   apr: 1153017,   may: 1153017   },
    { entity: 'SFM',              jan: 1131945,   feb: 879806,    mar: 918123,    apr: 1907553,   may: 1907553   },
    { entity: 'SEON',             jan: 5886468,   feb: 4382651,   mar: 3032557,   apr: 1594826,   may: 1594826   },
    { entity: 'FLM',              jan: 268743,    feb: 232980,    mar: 148378,    apr: 246989,    may: 246989    },
    { entity: 'COBAN',            jan: 657861,    feb: 649483,    mar: 614407,    apr: 575018,    may: 575018    },
    { entity: 'Road Ready',       jan: 290560,    feb: 414017,    mar: 261808,    apr: 352750,    may: 352750    },
  ],
};

async function seed() {
  await connectFabric();
  const tabs = Object.keys(data);
  let ok = 0, fail = 0;
  for (const tab_type of tabs) {
    console.log(`\nSeeding ${data[tab_type].length} entities for ${YEAR}-${String(MONTH).padStart(2,'0')}-${String(DAY).padStart(2,'0')} [${tab_type}]…`);
    for (const row of data[tab_type]) {
      try {
        await mergeFinancialData({
          entity: row.entity,
          year: YEAR, month: MONTH, day: DAY,
          tab_type,
          months: { jan: row.jan, feb: row.feb, mar: row.mar, apr: row.apr,
                    may: row.may, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 },
          updated_by: 'seed',
        });
        console.log(`  ✓ ${row.entity}`);
        ok++;
      } catch (err) {
        console.error(`  ✗ ${row.entity}: ${err.message}`);
        fail++;
      }
    }
  }
  console.log(`\nDone: ${ok} succeeded, ${fail} failed.`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
