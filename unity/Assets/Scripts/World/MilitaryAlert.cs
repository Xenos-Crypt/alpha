using UnityEngine;

namespace AnotherWorld.World
{
    // Separate from PoliceDispatch's traffic-citation system on purpose: police
    // pursue to arrest (see PoliceDispatch.Surrender()), the military does not.
    // Raised once from CityServices when the player steals from a military
    // facility; MilitaryGuard-flagged HostileCreatures only turn hostile while
    // this is active, and they don't offer a surrender/citation off-ramp.
    public static class MilitaryAlert
    {
        public static float Timer;
        public static bool Active => Timer > 0;

        public static void Raise(float seconds = 90)
        {
            if (!Active) CityServices.Instance?.Notify("MILITARY ALERT — armed response is hunting you down.");
            Timer = Mathf.Max(Timer, seconds);
        }

        public static void Update(float dt) { Timer = Mathf.Max(0, Timer - dt); }
    }
}
