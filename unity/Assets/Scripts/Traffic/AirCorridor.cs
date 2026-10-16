using UnityEngine;
namespace AnotherWorld.Traffic
{
    // Category 10, #96: "Operating a permitted flying vehicle inside a
    // prohibited air corridor." Low-altitude flight (skycars weaving through
    // the city) stays unrestricted — the corridor only matters once a vehicle
    // climbs into controlled high-altitude airspace, which is allowed only
    // along the approach to the airport or the rocket launch pad.
    public static class AirCorridor
    {
        public const float ControlledAltitude = 40;
        static readonly Vector2[] Permitted =
        {
            new(-690, -20),   // Airport approach (Airport Arrivals / Aircraft Maintenance cluster)
            new(452, 950),    // Rocket launch pad
        };
        const float CorridorRadius = 160;
        public static bool InPermittedCorridor(Vector3 position)
        {
            if (position.y < ControlledAltitude) return true;
            foreach (var p in Permitted)
                if ((new Vector2(position.x, position.z) - p).sqrMagnitude < CorridorRadius * CorridorRadius) return true;
            return false;
        }
    }
}
