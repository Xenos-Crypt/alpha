using System;
using System.IO;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using AnotherWorld.Traffic;
static class Program
{
    static void Check(bool value,string message){if(!value)throw new Exception(message);}
    static void Tick(TrafficRules j,float seconds,CrossingDemand bike=CrossingDemand.None,bool tram=false,bool occupied=false){j.Tick(seconds,bike,tram,occupied);}
    static void Main()
    {
        var idle=new TrafficRules();
        for(int i=0;i<1200;i++){Tick(idle,.2f);Check(idle.Signal(RoadUser.Pedestrian,TravelAxis.X)==SignalState.Red&&idle.Signal(RoadUser.Pedestrian,TravelAxis.Z)==SignalState.Red,"Unrequested pedestrian green");Check(!(idle.Signal(RoadUser.Car,TravelAxis.X)==SignalState.Green&&idle.Signal(RoadUser.Car,TravelAxis.Z)==SignalState.Green),"Conflicting car greens");}
        var j=new TrafficRules();Tick(j,1.5f);j.RequestCrossing(TravelAxis.X);Tick(j,4);
        Check(j.Signal(RoadUser.Car,TravelAxis.X)==SignalState.Amber,"No amber before requested crossing");
        Tick(j,2);Tick(j,2,occupied:true);Check(j.Phase==JunctionPhase.Clearance,"Crossing opened before traffic cleared");
        Tick(j,.1f);Check(j.Signal(RoadUser.Pedestrian,TravelAxis.X)==SignalState.Green&&j.Signal(RoadUser.Pedestrian,TravelAxis.Z)==SignalState.Red,"Directional request opened unrequested crossing");
        Check(j.Signal(RoadUser.Car,TravelAxis.X)==SignalState.Red&&j.Signal(RoadUser.Car,TravelAxis.Z)==SignalState.Red,"Cars released against a crossing");
        j.RequestCrossing(TravelAxis.Z);Tick(j,24,occupied:true);Check(j.Phase==JunctionPhase.Pedestrians,"Walk phase ended with someone crossing");
        Tick(j,.1f);Tick(j,1.5f);Check(j.ActiveCrossings==CrossingDemand.Z,"Queued second direction lost");
        var both=new TrafficRules();both.RequestCrossing(TravelAxis.X);both.RequestCrossing(TravelAxis.Z);Tick(both,2);
        Check(both.ActiveCrossings==CrossingDemand.Both,"Both buttons did not coordinate both crossings");
        var bikes=new TrafficRules();Tick(bikes,2,CrossingDemand.X);Check(bikes.Signal(RoadUser.Bicycle,TravelAxis.X)==SignalState.Green&&bikes.Signal(RoadUser.Bicycle,TravelAxis.Z)==SignalState.Red,"Conflicting bicycle greens");
        Tick(bikes,6,CrossingDemand.X);Tick(bikes,2,CrossingDemand.X);Check(bikes.Phase==JunctionPhase.CarsX,"Bicycle detector starved cars");
        var rail=new TrafficRules();Tick(rail,2,tram:true);Check(rail.Signal(RoadUser.Tram,TravelAxis.X)==SignalState.Green&&rail.Signal(RoadUser.Car,TravelAxis.X)==SignalState.Red,"Tram/car conflict");
        rail.RequestCrossing(TravelAxis.Z);Tick(rail,30,tram:true,occupied:true);Check(rail.Phase==JunctionPhase.Tram,"Moving tram preempted by crossing");
        Tick(rail,.1f);Tick(rail,2);Check(rail.Phase==JunctionPhase.Pedestrians,"Tram never released waiting crossing");
        Check(Math.Abs(new TrafficRules().LimitTravel(40,100,4.4f,RoadUser.Car,TravelAxis.X)-17.3f)<.001f,"Long frame crossed red stop line");
        Check(new TrafficRules().LimitTravel(18,5,4.4f,RoadUser.Car,TravelAxis.X)==5,"Committed car prevented from clearing");
        Check(TrafficRules.CarLane-1.25f>4.65f,"Car envelope overlaps median platform");
        Check(TrafficRules.BicycleLane+.8f<TrafficRules.RoadHalfWidth,"Bicycle envelope outside roadway");
        Check(TrafficRules.CarLane+1.25f<TrafficRules.BicycleLane-.8f,"Bus/car envelope overlaps bicycle lane");
        Check(TrafficRules.Spacing*.5f-23*.5f>TrafficRules.CrossingOffset+1.3f,"Cycle paint overlaps zebra");
        Check(TrafficRules.WalkSeconds>36/1.65f,"Walk interval too short for wider street");
        Console.WriteLine("PASS: button-only/directional/combined crossings, amber and clearance, bicycle exclusion/fairness, tram clearance, lane/platform separation");
        var ledger=new AnotherWorld.World.IndustryLedger();
        var order=new AnotherWorld.World.ProductionOrder{Input=AnotherWorld.World.IndustrialResource.Materials,InputAmount=3,EnergyCost=4,Output=AnotherWorld.World.IndustrialResource.Components,OutputAmount=2,Duration=10};
        Check(order.Start(ledger)&&ledger[AnotherWorld.World.IndustrialResource.Materials]==37&&ledger[AnotherWorld.World.IndustrialResource.Energy]==56,"Production did not reserve resources");
        Check(!order.Start(ledger),"Duplicate production charged resources twice");
        Check(!order.Advance(9,ledger)&&ledger[AnotherWorld.World.IndustrialResource.Components]==8,"Production completed before duration");
        Check(order.Advance(1,ledger)&&ledger[AnotherWorld.World.IndustrialResource.Components]==10,"Completed production did not create output");
        Check(!order.Advance(100,ledger)&&ledger[AnotherWorld.World.IndustrialResource.Components]==10,"Completed job produced duplicate output");
        var empty=new AnotherWorld.World.IndustryLedger{Stock=new int[6]};Check(!order.Start(empty),"Production accepted missing resources");
        Console.WriteLine("PASS: industry resource reservation, duplicate start protection, timed output, insufficient stock");
        string assets=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../Assets"));int count=0;
        foreach(string file in Directory.EnumerateFiles(assets,"*.cs",SearchOption.AllDirectories))
        {
            var tree=CSharpSyntaxTree.ParseText(File.ReadAllText(file),new CSharpParseOptions(LanguageVersion.CSharp9,preprocessorSymbols:new[]{"UNITY_EDITOR","UNITY_WEBGL"}),file);
            var errors=tree.GetDiagnostics().Where(d=>d.Severity==DiagnosticSeverity.Error).ToArray();
            Check(errors.Length==0,string.Join(Environment.NewLine,errors.Select(e=>e.ToString())));
            foreach(var declaration in tree.GetRoot().DescendantNodes().OfType<VariableDeclarationSyntax>())Check(!declaration.Type.IsVar||declaration.Variables.Count==1,"Multiple implicit variables: "+file);
            count++;
        }
        Console.WriteLine("PASS: C# 9 syntax for "+count+" Unity scripts");
    }
}
