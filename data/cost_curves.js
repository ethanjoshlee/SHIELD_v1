/**
 * Cost assumptions per interceptor type (in $M per unit).
 *
 * NOTE: All values are preliminary placeholders.
 */

export const COST_CURVES = {
  boost_kinetic:     { unitCost_M: 15,  label: "Space-Based Kinetic (Boost)" },
  boost_laser:       { unitCost_M: 25,  label: "Space-Based Laser (Boost)" },
  midcourse_gbi:     { unitCost_M: 75,  label: "Ground-Based Interceptor" },
  midcourse_kinetic: { unitCost_M: 15,  label: "Space-Based Kinetic (Midcourse)" },
  midcourse_laser:   { unitCost_M: 25,  label: "Space-Based Laser (Midcourse)" },
  terminal_kinetic:  { unitCost_M: 3,   label: "THAAD/Patriot-class" },
  terminal_nuclear:  { unitCost_M: 50,  label: "Nuclear-Tipped Terminal" },
};
