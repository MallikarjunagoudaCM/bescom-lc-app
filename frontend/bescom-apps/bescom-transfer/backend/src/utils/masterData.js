// BESCOM organisational hierarchy master data
const HIERARCHY = {
  zones: [
    {
      name: "Southern Zone",
      circles: [
        {
          name: "Bengaluru South Circle",
          divisions: [
            {
              name: "Jayanagar Division",
              subDivisions: [
                { name: "BTM Layout Sub-division", sections: ["BTM 1st Stage O&M","BTM 2nd Stage O&M","JP Nagar O&M"] },
                { name: "Banashankari Sub-division", sections: ["Banashankari O&M","Kanakapura Road O&M"] }
              ]
            },
            {
              name: "Basavanagudi Division",
              subDivisions: [
                { name: "Basavanagudi Sub-division", sections: ["Gandhi Bazaar O&M","VV Puram O&M"] }
              ]
            }
          ]
        },
        {
          name: "Bengaluru East Circle",
          divisions: [
            {
              name: "Indiranagar Division",
              subDivisions: [
                { name: "Indiranagar Sub-division", sections: ["Indiranagar O&M","HAL O&M","Domlur O&M"] }
              ]
            }
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
            {
              name: "Rajajinagar Division",
              subDivisions: [
                { name: "Vijayanagar Sub-division", sections: ["Vijayanagar O&M","Magadi Road O&M"] },
                { name: "Rajajinagar Sub-division", sections: ["Rajajinagar O&M","Srirampuram O&M"] }
              ]
            },
            {
              name: "Malleshwaram Division",
              subDivisions: [
                { name: "Sadashivanagar Sub-division", sections: ["Sadashivanagar O&M","Palace Guttahalli O&M"] }
              ]
            }
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
            {
              name: "Tumkur Road Division",
              subDivisions: [
                { name: "Yeshwanthpur Sub-division", sections: ["Yeshwanthpur O&M","Peenya O&M"] }
              ]
            }
          ]
        }
      ]
    }
  ]
};

module.exports = HIERARCHY;
