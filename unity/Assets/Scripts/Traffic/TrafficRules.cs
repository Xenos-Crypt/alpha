using System;
namespace AnotherWorld.Traffic
{
    public enum RoadUser { Car, Bicycle, Pedestrian, Tram }
    public enum TravelAxis { X, Z }
    public enum SignalState { Red, Amber, Green }
    [Flags] public enum CrossingDemand { None=0, X=1, Z=2, Both=3 }
    public enum JunctionPhase { Clearance, CarsX, CarsZ, Pedestrians, BicyclesX, BicyclesZ, Tram }
    public sealed class TrafficRules
    {
        public const float Spacing=64, RoadHalfWidth=14, CarLane=7.4f, BicycleLane=11.8f, TrackHalfWidth=1.65f;
        // Modelled urban limit (rule 124). NPC CruiseSpeed (9) sits comfortably
        // under it; only deliberately fast driving (the player, or a vehicle
        // forced faster) trips it.
        public const float SpeedLimit=12;
        public const float CrossingOffset=18, StopLine=20.5f, ClearanceSeconds=1.5f, WalkSeconds=24;
        public JunctionPhase Phase { get; private set; }=JunctionPhase.Clearance;
        public JunctionPhase NextPhase { get; private set; }=JunctionPhase.CarsX;
        public float Age { get; private set; }
        public bool Roundabout { get; set; }
        public CrossingDemand PendingCrossings { get; private set; }
        public CrossingDemand ActiveCrossings { get; private set; }
        JunctionPhase nextCars=JunctionPhase.CarsX;
        float bikeCooldownX,bikeCooldownZ;
        bool carTurnDue;
        public void RequestCrossing(TravelAxis axis)
        {
            var demand=axis==TravelAxis.X?CrossingDemand.X:CrossingDemand.Z;
            if(Phase!=JunctionPhase.Pedestrians||(ActiveCrossings&demand)==0)PendingCrossings|=demand;
        }
        public void Tick(float dt,bool pedestrians,bool bicycles,bool tram,bool occupied)
        {
            if(pedestrians){RequestCrossing(TravelAxis.X);RequestCrossing(TravelAxis.Z);}
            Tick(dt,bicycles?CrossingDemand.Both:CrossingDemand.None,tram,occupied);
        }
        public void Tick(float dt,CrossingDemand bicycles,bool tram,bool occupied)
        {
            dt=Math.Max(0,dt);Age+=dt;bikeCooldownX=Math.Max(0,bikeCooldownX-dt);bikeCooldownZ=Math.Max(0,bikeCooldownZ-dt);
            var wanted=PendingCrossings!=0?JunctionPhase.Pedestrians
                :carTurnDue?nextCars
                :(bicycles&CrossingDemand.X)!=0&&bikeCooldownX<=0?JunctionPhase.BicyclesX
                :(bicycles&CrossingDemand.Z)!=0&&bikeCooldownZ<=0?JunctionPhase.BicyclesZ:tram?JunctionPhase.Tram:nextCars;
            if(Phase==JunctionPhase.Clearance)
            {
                NextPhase=wanted;if(Age<ClearanceSeconds||occupied)return;
                Phase=NextPhase;Age=0;
                if(Phase==JunctionPhase.CarsX||Phase==JunctionPhase.CarsZ)carTurnDue=false;
                if(Phase==JunctionPhase.Pedestrians){ActiveCrossings=PendingCrossings;PendingCrossings=CrossingDemand.None;}
                return;
            }
            if(Phase==JunctionPhase.Pedestrians){if(Age<WalkSeconds||occupied)return;ActiveCrossings=CrossingDemand.None;carTurnDue=true;Change(nextCars);return;}
            if(Phase==JunctionPhase.Tram){if(Age<6||tram||occupied)return;carTurnDue=true;Change(nextCars);return;}
            if(Phase==JunctionPhase.BicyclesX||Phase==JunctionPhase.BicyclesZ)
            {
                if(Age<6||occupied)return;
                if(Phase==JunctionPhase.BicyclesX)bikeCooldownX=12;else bikeCooldownZ=12;
                carTurnDue=true;
                Change(nextCars);return;
            }
            if(Roundabout){if(PendingCrossings!=0)Change(JunctionPhase.Pedestrians);return;}
            if(wanted!=Phase&&wanted!=nextCars&&Age>=4&&Age<8)Age=8;
            if(Age<10)return;
            nextCars=Phase==JunctionPhase.CarsX?JunctionPhase.CarsZ:JunctionPhase.CarsX;
            Change(wanted==Phase?nextCars:wanted);
        }
        void Change(JunctionPhase next){NextPhase=next;Phase=JunctionPhase.Clearance;Age=0;}
        public SignalState Signal(RoadUser user,TravelAxis axis)
        {
            bool green=user==RoadUser.Pedestrian?Phase==JunctionPhase.Pedestrians&&(ActiveCrossings&(axis==TravelAxis.X?CrossingDemand.X:CrossingDemand.Z))!=0
                :user==RoadUser.Bicycle?Roundabout&&(Phase==JunctionPhase.CarsX||Phase==JunctionPhase.CarsZ)||Phase==(axis==TravelAxis.X?JunctionPhase.BicyclesX:JunctionPhase.BicyclesZ)
                :user==RoadUser.Tram?axis==TravelAxis.X&&Phase==JunctionPhase.Tram
                :Roundabout&&(Phase==JunctionPhase.CarsX||Phase==JunctionPhase.CarsZ)||Phase==(axis==TravelAxis.X?JunctionPhase.CarsX:JunctionPhase.CarsZ);
            if(!green)return SignalState.Red;
            return user==RoadUser.Car&&!Roundabout&&Age>=8?SignalState.Amber:SignalState.Green;
        }
        public float LimitTravel(float ahead,float distance,float length,RoadUser user,TravelAxis axis)
        {
            float stop=StopLine+length*.5f;
            if(ahead<stop-.15f||Signal(user,axis)==SignalState.Green)return Math.Max(0,distance);
            return Math.Max(0,Math.Min(distance,ahead-stop));
        }
    }
}
