#include "AWOrionTransit.h"
#include "AWCharacter.h"
#include "Components/StaticMeshComponent.h"
#include "Components/PointLightComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

AAWOrionLine::AAWOrionLine()
{
    PrimaryActorTick.bCanEverTick=true;
    SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("FixedGuidewayOrigin")));
    TrainRoot=CreateDefaultSubobject<USceneComponent>(TEXT("GuidedConsist"));TrainRoot->SetupAttachment(RootComponent);
    for(int32 I=0;I<8;++I)
    {
        auto* Section=CreateDefaultSubobject<UStaticMeshComponent>(*FString::Printf(TEXT("PassengerSection%d"),I));
        Section->SetupAttachment(TrainRoot);Section->SetCollisionProfileName(TEXT("NoCollision"));Sections.Add(Section);
    }
    ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    auto* Gate=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PlatformSafetyGate"));
    Gate->SetupAttachment(RootComponent);Gate->SetStaticMesh(Cube.Object);
    Gate->SetRelativeScale3D(FVector(2.5f,.10f,1.1f));Gate->SetCollisionProfileName(TEXT("BlockAll"));
    for(int32 I=0;I<2;++I)
    {
        auto* Door=CreateDefaultSubobject<UStaticMeshComponent>(*FString::Printf(TEXT("BoardingDoor%d"),I));
        Door->SetupAttachment(TrainRoot);Door->SetStaticMesh(Cube.Object);Door->SetCollisionProfileName(TEXT("NoCollision"));
        Door->SetRelativeScale3D(FVector(.44f,.06f,2.f));Doors.Add(Door);
    }
    CabinLight=CreateDefaultSubobject<UPointLightComponent>(TEXT("PassengerCabinLight"));
    CabinLight->SetupAttachment(TrainRoot);CabinLight->SetRelativeLocation(FVector(500,0,300));
    CabinLight->SetIntensity(70);CabinLight->SetAttenuationRadius(1500);CabinLight->SetCastShadows(false);
}
void AAWOrionLine::ConfigureRoute(bool ElevatedTram){bElevatedTram=ElevatedTram;ApplyFleet();}
void AAWOrionLine::OnConstruction(const FTransform& Transform){Super::OnConstruction(Transform);ApplyFleet();}
void AAWOrionLine::BeginPlay(){Super::BeginPlay();ApplyFleet();ResetAtCentralStation();}
void AAWOrionLine::ApplyFleet()
{
    const FString Prefix=bElevatedTram?TEXT("orion_tram_"):TEXT("orion_regional_");
    auto LoadMesh=[](const FString& Name){return LoadObject<UStaticMesh>(nullptr,*FString::Printf(
        TEXT("/Game/FutureTransport/%s/%s/StaticMeshes/%s.%s"),*Name,*Name,*Name,*Name));};
    UStaticMesh* Cab=LoadMesh(Prefix+TEXT("cab"));UStaticMesh* Coach=LoadMesh(Prefix+TEXT("coach"));
    const int32 Count=bElevatedTram?4:8;const float Spacing=(bElevatedTram?1000.f:2500.f)+12;
    for(int32 I=0;I<Sections.Num();++I)
    {
        Sections[I]->SetVisibility(I<Count);
        if(I>=Count)continue;
        Sections[I]->SetStaticMesh(I==0||I==Count-1?Cab:Coach);
        Sections[I]->SetRelativeLocation(FVector(((Count-1)*.5f-I)*Spacing,0,0));
        Sections[I]->SetRelativeRotation(FRotator(0,I==Count-1?-90:90,0));
    }
    auto* Glazing=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Future/Materials/MidnightGlazing.MidnightGlazing"));
    for(auto& Door:Doors)if(Glazing)Door->SetMaterial(0,Glazing);
}
float AAWOrionLine::TargetPosition() const
{
    const float End=bElevatedTram?15000.f:48000.f;
    return TargetIndex==0?End:TargetIndex==2?-End:0;
}
void AAWOrionLine::ResetAtCentralStation()
{
    Position=Speed=0;Dwell=8;DoorAmount=1;TargetIndex=0;bEmergency=false;bPower=true;
    TrainRoot->SetRelativeLocation(FVector::ZeroVector);TrainRoot->SetRelativeRotation(FRotator::ZeroRotator);
}
void AAWOrionLine::Advance(float DT)
{
    if(Dwell>0){Speed=0;Dwell=FMath::Max(0.f,Dwell-DT);return;}
    if(DoorAmount>.01f){Speed=0;return;}
    const float Remaining=TargetPosition()-Position;
    const float Brake=bEmergency?220.f:110.f;
    const float Target=bEmergency||!bPower?0:FMath::Min(bElevatedTram?1389.f:4500.f,FMath::Sqrt(2*Brake*FMath::Abs(Remaining)));
    Speed=FMath::FInterpConstantTo(Speed,Target,DT,Target<Speed?Brake:80);
    const float Step=Speed*DT;
    if(!bEmergency&&bPower&&FMath::Abs(Remaining)<FMath::Max(2.f,Step))
    {Position=TargetPosition();Speed=0;Dwell=FMath::Abs(Position)<1?8:4;TargetIndex=(TargetIndex+1)%4;}
    else Position+=FMath::Sign(Remaining)*Step;
}
void AAWOrionLine::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    float Remaining=FMath::Min(DeltaSeconds,.25f);
    while(Remaining>0){const float Step=FMath::Min(Remaining,.05f);Advance(Step);Remaining-=Step;}
    const bool Boarding=FMath::Abs(Position)<1&&Speed<1&&Dwell>1&&!bEmergency&&bPower;
    DoorAmount=FMath::FInterpConstantTo(DoorAmount,Boarding?1.f:0.f,DeltaSeconds,2);
    TrainRoot->SetRelativeLocation(FVector(Position,0,0));
    // Cabs at both ends allow reversal without rotating the consist.
    for(int32 I=0;I<Doors.Num();++I)Doors[I]->SetRelativeLocation(FVector(500+(I?1:-1)*(23+DoorAmount*55),-(bElevatedTram?143:173),190));
    if(auto* Gate=Cast<UStaticMeshComponent>(GetDefaultSubobjectByName(TEXT("PlatformSafetyGate"))))
    {
        Gate->SetRelativeLocation(FVector(500,-(bElevatedTram?150:180),145-110*DoorAmount));
        Gate->SetVisibility(DoorAmount<.95f);
        Gate->SetCollisionEnabled(DoorAmount>.95f?ECollisionEnabled::NoCollision:ECollisionEnabled::QueryAndPhysics);
    }
}
FVector AAWOrionLine::TrainLocation() const{return TrainRoot->GetComponentLocation();}
AAWCharacter* AAWOrionLine::GetRider() const{return Rider.Get();}
FVector AAWOrionLine::BoardingPoint() const{return GetActorLocation()+FVector(500,-(bElevatedTram?340:540),180);}
float AAWOrionLine::GuidewayErrorCm() const{return FMath::Abs(TrainRoot->GetRelativeLocation().Y)+FMath::Abs(TrainRoot->GetRelativeLocation().Z);}
bool AAWOrionLine::Board(AAWCharacter* Passenger)
{
    if(!Passenger||Rider.IsValid()||!DoorsAreOpen()||FVector::Dist(Passenger->GetActorLocation(),BoardingPoint())>350)return false;
    Rider=Passenger;Passenger->GetCharacterMovement()->StopMovementImmediately();Passenger->GetCharacterMovement()->DisableMovement();
    Passenger->SetActorEnableCollision(false);Passenger->SetActorHiddenInGame(true);
    Passenger->AttachToComponent(TrainRoot,FAttachmentTransformRules::SnapToTargetNotIncludingScale);
    Passenger->SetActorRelativeLocation(FVector(500,0,180));
    if(auto* PC=Cast<APlayerController>(Passenger->GetController()))PC->SetControlRotation(FRotator(0,0,0));
    return true;
}
bool AAWOrionLine::Alight()
{
    if(!Rider.IsValid()||!DoorsAreOpen()||FMath::Abs(Position)>1||Speed>1)return false;
    auto* Passenger=Rider.Get();Passenger->DetachFromActor(FDetachmentTransformRules::KeepWorldTransform);
    Passenger->SetActorLocation(BoardingPoint(),false);Passenger->SetActorEnableCollision(true);Passenger->SetActorHiddenInGame(false);
    Passenger->GetCharacterMovement()->SetMovementMode(MOVE_Walking);Rider.Reset();return true;
}
FString AAWOrionLine::ServiceStatus() const
{
    return FString::Printf(TEXT("ORION %s | %.0f km/h | %s | doors %s | guideway error %.1f cm"),
        bElevatedTram?TEXT("ELEVATED TRAM"):TEXT("UNDERGROUND REGIONAL"),Speed*.036f,
        bEmergency?TEXT("EMERGENCY STOP"):!bPower?TEXT("POWER LOST / BRAKING"):Dwell>0?TEXT("STATION / TURNBACK"):TEXT("IN SERVICE"),
        DoorsAreOpen()?TEXT("OPEN"):TEXT("LOCKED"),GuidewayErrorCm());
}
AAWTransitLift::AAWTransitLift(){SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("LiftAccess")));}
bool AAWTransitLift::Travel(AAWCharacter* Passenger)
{
    if(!Passenger||FVector::Dist(Passenger->GetActorLocation(),GetActorLocation())>350||Passenger->GetAttachParentActor())return false;
    Passenger->GetCharacterMovement()->StopMovementImmediately();
    if(!Passenger->TeleportTo(Destination,FRotator(0,90,0)))return false;
    Passenger->GetCharacterMovement()->SetMovementMode(MOVE_Walking);return true;
}
