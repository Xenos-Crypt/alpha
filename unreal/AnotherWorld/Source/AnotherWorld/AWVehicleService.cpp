#include "AWAuroraVehicle.h"
#include "AWCharacter.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/World.h"
#include "Engine/OverlapResult.h"
#include "Engine/StaticMesh.h"

bool AAWAuroraVehicle::CanService() const
{
    return !IsAirMode()&&GroundDistance()<110&&FMath::Abs(Speed)<10;
}
bool AAWAuroraVehicle::PanelsClosed() const
{
    return bBootLocked&&bBootLatched&&!bBootOpen&&!bBonnetOpen&&!bDoorsOpen&&BootAngle<.1f&&BonnetAngle<.1f&&DoorAngle<.1f;
}
void AAWAuroraVehicle::ToggleBoot()
{
    if(!CanService())return;
    bBootOpen=!bBootOpen;
    if(bBootOpen){bBootLocked=false;bBootLatched=false;BootRelease=.25f;bBootObstructed=false;}
}
void AAWAuroraVehicle::ToggleBonnet(){if(CanService())bBonnetOpen=!bBonnetOpen;}
void AAWAuroraVehicle::ToggleDoors(){if(CanService())bDoorsOpen=!bDoorsOpen;}
void AAWAuroraVehicle::ToggleParkingPads()
{
    if(!CanService())return;
    if(!bParkingPads)
    {
        FCollisionQueryParams Query;Query.AddIgnoredActor(this);
        for(const auto& Pad:ParkingPads)
        {
            const FVector Foot=VisualRoot->GetComponentTransform().TransformPosition(
                FVector(Pad->GetRelativeLocation().X,Pad->GetRelativeLocation().Y,0));
            FHitResult Hit;
            if(!GetWorld()->LineTraceSingleByChannel(Hit,Foot+FVector(0,0,30),Foot-FVector(0,0,60),ECC_Visibility,Query)
                ||FMath::Abs(Hit.Location.Z-Foot.Z)>15)return;
        }
    }
    bParkingPads=!bParkingPads;
}
void AAWAuroraVehicle::AnimateMechanics(float DT)
{
    PadAmount=FMath::FInterpConstantTo(PadAmount,bParkingPads?1.f:0.f,DT,.8f);
    WheelRoll=FMath::Fmod(WheelRoll+(!bFlight?Speed/42.f*180.f/PI*DT:0),360.f);
    FCollisionQueryParams Query;Query.AddIgnoredActor(this);
    if(Driver.IsValid())Query.AddIgnoredActor(Driver.Get());
    for(int32 I=0;I<4;++I)
    {
        const float Side=I%2?1.f:-1.f,Row=I<2?1.f:-1.f;
        float Travel=0;
        if(!bFlight)
        {
            const FVector Axle=VisualRoot->GetComponentTransform().TransformPosition(FVector(Side*125,Row*180,42));
            FHitResult Hit;
            if(GetWorld()->LineTraceSingleByChannel(Hit,Axle+FVector(0,0,35),Axle-FVector(0,0,80),ECC_Visibility,Query))
                Travel=FMath::Clamp(Hit.Location.Z-(GetActorLocation().Z-90),-8.f,8.f);
        }
        Suspension[I]=FMath::FInterpTo(Suspension[I],Travel,DT,10);
        Gear[I]->SetRelativeScale3D(FVector::OneVector);
        Gear[I]->SetRelativeLocation(FVector(Side*125,Row*180,42+Suspension[I]+45*(1-GearAmount)));
        Gear[I]->SetRelativeRotation(FRotator(Side*90*(1-GearAmount),0,0));
        Gear[I]->SetVisibility(GearAmount>.02f,true);
        Tyres[I]->SetRelativeRotation(FRotator(0,Row<0?Steering*28:0,-WheelRoll));
        ParkingPads[I]->SetRelativeLocation(FVector(Side*85,Row*135,50*(1-PadAmount)));
        ParkingPads[I]->SetVisibility(PadAmount>.01f);
    }
    BootRelease=FMath::Max(0.f,BootRelease-DT);
    const float OldAngle=BootAngle;
    if(BootRelease<=0)BootAngle=FMath::FInterpConstantTo(BootAngle,bBootOpen?68.f:0.f,DT,42);
    // Unreal positive roll lowers +Y. The aft-extending lid must roll negative.
    BootLid->SetRelativeRotation(FRotator(0,0,-BootAngle));
    if(!bBootOpen&&OldAngle>BootAngle)
    {
        const auto LocalBounds=BootLid->GetStaticMesh()->GetBounds();
        const FTransform LidTransform=BootLid->GetComponentTransform();
        const FVector SensorOrigin=LidTransform.TransformPosition(LocalBounds.Origin);
        const FVector SensorExtent=LocalBounds.BoxExtent*LidTransform.GetScale3D().GetAbs()+FVector(4);
        // Game obstruction sensor: check the closing panel and reopen if an
        // external blocking object occupies its path. This is not a force model.
        TArray<FOverlapResult> Hits;
        if(GetWorld()->OverlapMultiByChannel(Hits,SensorOrigin,LidTransform.GetRotation(),ECC_Pawn,
            FCollisionShape::MakeBox(SensorExtent),Query))
        {
            for(const auto& Hit:Hits)if(Hit.bBlockingHit)
                UE_LOG(LogTemp,Display,TEXT("Boot closing obstruction: %s / %s at %s, extent %s"),*GetNameSafe(Hit.GetActor()),*GetNameSafe(Hit.GetComponent()),*SensorOrigin.ToString(),*SensorExtent.ToString());
            bBootOpen=true;bBootObstructed=true;bBootLatched=false;bBootLocked=false;BootAngle=OldAngle;
        }
    }
    if(!bBootOpen&&BootAngle<.1f){bBootLatched=true;bBootLocked=true;}
    BonnetAngle=FMath::FInterpConstantTo(BonnetAngle,bBonnetOpen?60.f:0.f,DT,42);
    DoorAngle=FMath::FInterpConstantTo(DoorAngle,bDoorsOpen?65.f:0.f,DT,55);
    Bonnet->SetRelativeRotation(FRotator(0,0,BonnetAngle));
    for(int32 I=0;I<Doors.Num();++I)Doors[I]->SetRelativeRotation(FRotator(0,(I? -1:1)*DoorAngle,0));
    for(int32 I=0;I<BootStruts.Num();++I)
    {
        const float Side=I?1.f:-1.f;
        const FVector Base(Side*55,190,66);
        const FVector Head=BootLid->GetRelativeTransform().TransformPosition(FVector(Side*55,70,-4));
        BootStruts[I]->SetRelativeLocation((Base+Head)*.5f);
        BootStruts[I]->SetRelativeRotation(FQuat::FindBetweenNormals(FVector::UpVector,(Head-Base).GetSafeNormal()));
        BootStruts[I]->SetRelativeScale3D(FVector(.035f,.035f,FVector::Dist(Base,Head)/100));
    }
}
float AAWAuroraVehicle::WheelContactErrorCm() const
{
    FCollisionQueryParams Query;Query.AddIgnoredActor(this);float Error=0;
    for(const auto& Wheel:Tyres)
    {
        const FVector Axle=Wheel->GetComponentLocation();FHitResult Hit;
        if(!GetWorld()->LineTraceSingleByChannel(Hit,Axle,Axle-FVector(0,0,100),ECC_Visibility,Query))return 1000;
        Error=FMath::Max(Error,FMath::Abs(Axle.Z-42-Hit.Location.Z));
    }
    return Error;
}
FString AAWAuroraVehicle::Diagnostics() const
{
    return FString::Printf(TEXT("SERVICE / GAME TELEMETRY\nWheels: 840 x 320 mm | wheelbase 3.60 m | track 2.50 m\nParking pads %.0f%% | gear %.0f%% | wing lock %s\nBoot: %s | latch %s | lock %s\nDTC: %s%s%s\nGround: %.1f cm | contact error %.1f cm | pack %.1f kWh\nB boot | H service bonnet | O doors | P parking pads | K close diagnostics"),
        PadAmount*100,GearAmount*100,Deployment>.99f?TEXT("FLIGHT"):Deployment<.01f?TEXT("ROAD"):TEXT("TRANSIT"),
        BootRelease>0?TEXT("RELEASING"):BootAngle>1?TEXT("OPEN"):TEXT("CLOSED"),
        bBootLatched?TEXT("CAUGHT"):TEXT("RELEASED"),bBootLocked?TEXT("LOCKED"):TEXT("UNLOCKED"),
        bBootObstructed?TEXT("BOOT_OBSTRUCTION "):TEXT(""),!PanelsClosed()?TEXT("PANEL_INTERLOCK "):TEXT(""),
        PadAmount>.01f?TEXT("PARKING_INTERLOCK"):TEXT(""),GroundDistance(),WheelContactErrorCm(),Battery);
}
