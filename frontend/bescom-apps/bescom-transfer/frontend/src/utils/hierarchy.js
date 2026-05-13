export const HIERARCHY = {
  zones: [
    {
      name: "Southern Zone",
      circles: [
        {
          name: "Bengaluru South Circle",
          divisions: [
            { name: "Jayanagar Division", subDivisions: [
                { name: "BTM Layout Sub-division", sections: ["BTM 1st Stage O&M","BTM 2nd Stage O&M","JP Nagar O&M"] },
                { name: "Banashankari Sub-division", sections: ["Banashankari O&M","Kanakapura Road O&M"] }
            ]},
            { name: "Basavanagudi Division", subDivisions: [
                { name: "Basavanagudi Sub-division", sections: ["Gandhi Bazaar O&M","VV Puram O&M"] }
            ]}
          ]
        },
        {
          name: "Bengaluru East Circle",
          divisions: [
            { name: "Indiranagar Division", subDivisions: [
                { name: "Indiranagar Sub-division", sections: ["Indiranagar O&M","HAL O&M","Domlur O&M"] }
            ]}
          ]
        }
      ]
    },
    {
      name: "Northern Zone",
      circles: [
        {
          name: "Bengaluru North Circle",
          divisions: [
            { name: "Rajajinagar Division", subDivisions: [
                { name: "Vijayanagar Sub-division", sections: ["Vijayanagar O&M","Magadi Road O&M"] },
                { name: "Rajajinagar Sub-division", sections: ["Rajajinagar O&M","Srirampuram O&M"] }
            ]},
            { name: "Malleshwaram Division", subDivisions: [
                { name: "Sadashivanagar Sub-division", sections: ["Sadashivanagar O&M","Palace Guttahalli O&M"] }
            ]}
          ]
        }
      ]
    },
    {
      name: "Western Zone",
      circles: [
        {
          name: "Tumkur Road Circle",
          divisions: [
            { name: "Tumkur Road Division", subDivisions: [
                { name: "Yeshwanthpur Sub-division", sections: ["Yeshwanthpur O&M","Peenya O&M"] }
            ]}
          ]
        }
      ]
    }
  ]
};

export const getZones   = () => HIERARCHY.zones.map(z => z.name);
export const getCircles = (zone) => HIERARCHY.zones.find(z => z.name === zone)?.circles.map(c => c.name) || [];
export const getDivisions = (zone, circle) => {
  const z = HIERARCHY.zones.find(z => z.name === zone);
  return z?.circles.find(c => c.name === circle)?.divisions.map(d => d.name) || [];
};
export const getSubDivisions = (zone, circle, division) => {
  const z = HIERARCHY.zones.find(z => z.name === zone);
  const c = z?.circles.find(c => c.name === circle);
  return c?.divisions.find(d => d.name === division)?.subDivisions.map(s => s.name) || [];
};
export const getSections = (zone, circle, division, subDivision) => {
  const z = HIERARCHY.zones.find(z => z.name === zone);
  const c = z?.circles.find(c => c.name === circle);
  const d = c?.divisions.find(d => d.name === division);
  return d?.subDivisions.find(s => s.name === subDivision)?.sections || [];
};
export const getAllDivisions = () => {
  const divs = [];
  HIERARCHY.zones.forEach(z => z.circles.forEach(c => c.divisions.forEach(d => divs.push(d.name))));
  return [...new Set(divs)];
};
