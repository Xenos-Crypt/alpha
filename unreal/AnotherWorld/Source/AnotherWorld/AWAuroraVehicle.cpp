#include "AWAuroraVehicle.h"
#include "AWCharacter.h"
#include "Camera/CameraComponent.h"
#include "Components/BoxComponent.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "UObject/ConstructorHelpers.h"

AAWAuroraVehicle::AAWAuroraVehicle()
{
    PrimaryActorTick.bCanEverTick=true;
    Collision=CreateDefaultSubobject<UBoxComponent>(TEXT("VehicleCollision"));
    SetRootComponent(Collision);
    Collision->SetBoxExtent(FVector(125,290,80));
    Collision->SetCollisionProfileName(TEXT("Pawn"));
    VisualRoot=CreateDefaultSubobject<USceneComponent>(TEXT("VisualRoot"));
    VisualRoot->SetupAttachment(Collision); VisualRoot->SetRelativeLocation(FVector(0,0,-90));
    // glTF's forward direction imports along local -Y; driving uses +Y.
    VisualRoot->SetRelativeRotation(FRotator(0,180,0));
    const TCHAR* Paths[]={
        TEXT("/Game/FutureTransport/aurora_x9_body/aurora_x9_body/StaticMeshes/aurora_x9_body.aurora_x9_body"),
        TEXT("/Game/FutureTransport/aurora_x9_motor/aurora_x9_motor/StaticMeshes/aurora_x9_motor.aurora_x9_motor"),
        TEXT("/Game/FutureTransport/aurora_x9_rotor/aurora_x9_rotor/StaticMeshes/aurora_x9_rotor.aurora_x9_rotor"),
        TEXT("/Game/FutureTransport/aurora_x9_wing/aurora_x9_wing/StaticMeshes/aurora_x9_wing.aurora_x9_wing"),
        TEXT("/Game/FutureTransport/aurora_x9_gear/aurora_x9_gear/StaticMeshes/aurora_x9_gear.aurora_x9_gear")};
    UStaticMesh* Meshes[5];
    for(int32 I=0;I<5;++I) { ConstructorHelpers::FObjectFinder<UStaticMesh> Asset(Paths[I]); Meshes[I]=Asset.Object; }
    auto Part=[this](const FString& Name,UStaticMesh* Mesh,USceneComponent* Parent)
    {
        auto* Component=CreateDefaultSubobject<UStaticMeshComponent>(*Name);
        Component->SetupAttachment(Parent); Component->SetStaticMesh(Mesh);
        Component->SetCollisionProfileName(TEXT("NoCollision"));
        return Component;
    };
    Body=Part(TEXT("CarbonCompositeBody"),Meshes[0],VisualRoot);
    ConstructorHelpers::FObjectFinder<UStaticMesh> StrutMesh(TEXT("/Game/FutureTransport/retractable_road_gear/retractable_road_gear/StaticMeshes/retractable_road_gear.retractable_road_gear"));
    ConstructorHelpers::FObjectFinder<UStaticMesh> TyreMesh(TEXT("/Game/FutureTransport/road_wheel/road_wheel/StaticMeshes/road_wheel.road_wheel"));
    ConstructorHelpers::FObjectFinder<UStaticMesh> BootMesh(TEXT("/Game/FutureTransport/luggage_boot_lid/luggage_boot_lid/StaticMeshes/luggage_boot_lid.luggage_boot_lid"));
    ConstructorHelpers::FObjectFinder<UStaticMesh> BonnetMesh(TEXT("/Game/FutureTransport/forward_service_lid/forward_service_lid/StaticMeshes/forward_service_lid.forward_service_lid"));
    ConstructorHelpers::FObjectFinder<UStaticMesh> DoorMesh(TEXT("/Game/FutureTransport/cabin_door/cabin_door/StaticMeshes/cabin_door.cabin_door"));
    ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    BootLid=Part(TEXT("LuggageBoot"),BootMesh.Object,VisualRoot);BootLid->SetRelativeLocation(FVector(0,165,98));
    Bonnet=Part(TEXT("ForwardServiceBay"),BonnetMesh.Object,VisualRoot);Bonnet->SetRelativeLocation(FVector(0,-146,98));
    for(int32 I=0;I<2;++I)
    {
        auto* Door=Part(FString::Printf(TEXT("CabinDoor%d"),I),DoorMesh.Object,VisualRoot);
        Door->SetRelativeLocation(FVector(I?105:-105,-90,98));Doors.Add(Door);
        BootStruts.Add(Part(FString::Printf(TEXT("BootActuator%d"),I),CylinderMesh.Object,VisualRoot));
    }
    for(int32 I=0;I<4;++I)
    {
        const float Side=I%2?1.f:-1.f, Row=I<2?1.f:-1.f;
        auto* Motor=Part(FString::Printf(TEXT("MainMotor%d"),I),Meshes[1],VisualRoot);
        Motor->SetRelativeLocation(FVector(Side*116,Row*145,70)); Motors.Add(Motor);
        auto* Rotor=Part(FString::Printf(TEXT("MainRotor%d"),I),Meshes[2],Motor); Rotors.Add(Rotor);
        auto* Wing=Part(FString::Printf(TEXT("FoldingWing%d"),I),Meshes[3],VisualRoot); Wings.Add(Wing);
        Wing->SetRelativeLocation(FVector(Side*110,Row*145,70));
        auto* Leg=Part(FString::Printf(TEXT("LandingGear%d"),I),StrutMesh.Object,VisualRoot); Gear.Add(Leg);
        Leg->SetRelativeLocation(FVector(Side*125,Row*180,42));
        Tyres.Add(Part(FString::Printf(TEXT("RoadWheel%d"),I),TyreMesh.Object,Leg));
        auto* Pad=Part(FString::Printf(TEXT("ParkingStabiliser%d"),I),Meshes[4],VisualRoot);
        Pad->SetRelativeLocation(FVector(Side*85,Row*135,50));ParkingPads.Add(Pad);Pad->SetVisibility(false);
    }
    for(int32 I=0;I<2;++I)
    {
        auto* Rotor=Part(FString::Printf(TEXT("FrontLiftRotor%d"),I),Meshes[2],VisualRoot);
        Rotor->SetRelativeLocation(FVector(I?69:-69,-185,102)); Rotor->SetRelativeScale3D(FVector(.58)); Rotors.Add(Rotor);
    }
    Boom=CreateDefaultSubobject<USpringArmComponent>(TEXT("FollowBoom"));
    Boom->SetupAttachment(Collision); Boom->SetRelativeLocation(FVector(0,0,100));
    Boom->TargetArmLength=650; Boom->bUsePawnControlRotation=true;
    Camera=CreateDefaultSubobject<UCameraComponent>(TEXT("VehicleCamera"));
    Camera->SetupAttachment(Boom,USpringArmComponent::SocketName); Camera->SetFieldOfView(90);
}

FString AAWAuroraVehicle::ModelName() const
{
    return VehicleVariant==1?TEXT("SKYLINE X7"):VehicleVariant==2?TEXT("AERODYNEX X12"):TEXT("AURORA X9");
}
void AAWAuroraVehicle::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);ApplyVariant();
}
void AAWAuroraVehicle::BeginPlay()
{
    Super::BeginPlay();ApplyVariant();
}
void AAWAuroraVehicle::SetVehicleVariant(int32 Variant)
{
    VehicleVariant=FMath::Clamp(Variant,0,2);ApplyVariant();
}
void AAWAuroraVehicle::ApplyVariant()
{
    const FString Prefix=VehicleVariant==1?TEXT("skyline_x7"):VehicleVariant==2?TEXT("aerodynex_x12"):TEXT("aurora_x9");
    auto Mesh=[](const FString& Name){return LoadObject<UStaticMesh>(nullptr,*FString::Printf(
        TEXT("/Game/FutureTransport/%s/%s/StaticMeshes/%s.%s"),*Name,*Name,*Name,*Name));};
    if(auto* Asset=Mesh(Prefix+TEXT("_body")))Body->SetStaticMesh(Asset);
    if(auto* Asset=Mesh(Prefix+TEXT("_motor")))for(auto& Motor:Motors)Motor->SetStaticMesh(Asset);
    if(auto* Asset=Mesh(TEXT("retractable_road_gear")))
        for(auto& Leg:Gear)Leg->SetStaticMesh(Asset);
    for(int32 I=4;I<Rotors.Num();++I)Rotors[I]->SetVisibility(VehicleVariant!=2);
}

void AAWAuroraVehicle::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis(TEXT("MoveForward"),this,&AAWAuroraVehicle::ForwardInput);
    Input->BindAxis(TEXT("MoveRight"),this,&AAWAuroraVehicle::TurnInput);
    Input->BindAxis(TEXT("VehicleLift"),this,&AAWAuroraVehicle::Lift);
    Input->BindAxis(TEXT("Turn"),this,&AAWAuroraVehicle::Look);
    Input->BindAxis(TEXT("LookUp"),this,&AAWAuroraVehicle::LookUp);
    Input->BindAction(TEXT("UseVehicle"),IE_Pressed,this,&AAWAuroraVehicle::ExitPressed);
    Input->BindAction(TEXT("FlightMode"),IE_Pressed,this,&AAWAuroraVehicle::ToggleFlight);
    Input->BindAction(TEXT("Sprint"),IE_Pressed,this,&AAWAuroraVehicle::BoostOn);
    Input->BindAction(TEXT("Sprint"),IE_Released,this,&AAWAuroraVehicle::BoostOff);
    Input->BindAction(TEXT("LandingGear"),IE_Pressed,this,&AAWAuroraVehicle::ToggleGear);
    Input->BindAction(TEXT("VehicleCamera"),IE_Pressed,this,&AAWAuroraVehicle::ToggleCamera);
    Input->BindAction(TEXT("ParkingPads"),IE_Pressed,this,&AAWAuroraVehicle::ToggleParkingPads);
    Input->BindAction(TEXT("VehicleBoot"),IE_Pressed,this,&AAWAuroraVehicle::ToggleBoot);
    Input->BindAction(TEXT("VehicleBonnet"),IE_Pressed,this,&AAWAuroraVehicle::ToggleBonnet);
    Input->BindAction(TEXT("VehicleDoors"),IE_Pressed,this,&AAWAuroraVehicle::ToggleDoors);
    Input->BindAction(TEXT("VehicleDiagnostics"),IE_Pressed,this,&AAWAuroraVehicle::ToggleDiagnostics);
}
void AAWAuroraVehicle::ForwardInput(float Value){if(!bScriptInput)Throttle=Value;}
void AAWAuroraVehicle::TurnInput(float Value){if(!bScriptInput)Steering=Value;}
void AAWAuroraVehicle::Lift(float Value){if(!bScriptInput)LiftInput=Value;}
void AAWAuroraVehicle::Look(float Value){LookYaw=FMath::Clamp(LookYaw+Value,-120.f,120.f);}
void AAWAuroraVehicle::LookUp(float Value){LookPitch=FMath::Clamp(LookPitch-Value,-65.f,40.f);}
void AAWAuroraVehicle::BoostOn(){bBoost=true;}
void AAWAuroraVehicle::BoostOff(){bBoost=false;}
void AAWAuroraVehicle::ToggleGear(){if(bFlight&&!bLanding)bGear=!bGear;}
void AAWAuroraVehicle::SetDriveInput(float Forward,float Turn,float LiftValue){bScriptInput=true;Throttle=FMath::Clamp(Forward,-1.f,1.f);Steering=FMath::Clamp(Turn,-1.f,1.f);LiftInput=FMath::Clamp(LiftValue,-1.f,1.f);}

bool AAWAuroraVehicle::FindGround(FHitResult& Hit) const
{
    FCollisionQueryParams Query; Query.AddIgnoredActor(this);
    if(Driver.IsValid())Query.AddIgnoredActor(Driver.Get());
    return GetWorld()->LineTraceSingleByChannel(Hit,GetActorLocation()+FVector(0,0,10),
        GetActorLocation()-FVector(0,0,610000),ECC_Visibility,Query);
}
float AAWAuroraVehicle::GroundDistance() const
{
    FHitResult Hit; return FindGround(Hit)?GetActorLocation().Z-Hit.Location.Z:610000;
}
bool AAWAuroraVehicle::EnterDriver(AAWCharacter* Character)
{
    if(!Character||Driver.IsValid()||FVector::Dist(Character->GetActorLocation(),GetActorLocation())>600)return false;
    auto* Player=Cast<APlayerController>(Character->GetController()); if(!Player)return false;
    Driver=Character;
    Character->GetCharacterMovement()->DisableMovement(); Character->SetActorEnableCollision(false);
    Character->SetActorHiddenInGame(true); Character->SetActorTickEnabled(false);
    Player->Possess(this); LookYaw=0;LookPitch=-12;
    return true;
}
bool AAWAuroraVehicle::LeaveDriver()
{
    auto* Player=Cast<APlayerController>(GetController());
    if(!Player||!Driver.IsValid()||GroundDistance()>130||FMath::Abs(Speed)>150||Deployment>.05f)return false;
    auto* Character=Driver.Get();
    const FVector Exit=GetActorLocation()+GetActorForwardVector()*240+FVector(0,0,10);
    FCollisionQueryParams Query;Query.AddIgnoredActor(this);Query.AddIgnoredActor(Character);
    if(GetWorld()->OverlapBlockingTestByChannel(Exit,FQuat::Identity,ECC_Pawn,
        FCollisionShape::MakeCapsule(34,88),Query))return false;
    Character->SetActorLocation(Exit,false);Character->SetActorEnableCollision(true);
    Character->SetActorHiddenInGame(false);Character->SetActorTickEnabled(true);
    Character->GetCharacterMovement()->SetMovementMode(MOVE_Walking);
    Player->Possess(Character);Driver.Reset();ClearDriveInput();bBoost=false;
    return true;
}
void AAWAuroraVehicle::ExitPressed()
{
    if(!LeaveDriver())if(auto* Player=Cast<APlayerController>(Controller))
        Player->ClientMessage(TEXT("Stop, land and fold the wings before leaving. Keep the exit clear."));
}
void AAWAuroraVehicle::ToggleFlight()
{
    if(!bFlight&&(!PanelsClosed()||PadAmount>.01f||bParkingPads))return;
    if(bFlight)
    {
        if(GroundDistance()>110){bLanding=!bLanding;bGear=true;}
        else {bFlight=false;bLanding=false;bGear=true;}
    }
    else {bFlight=true;bLanding=false;bGear=false;}
}
void AAWAuroraVehicle::ToggleCamera()
{
    bFirstPerson=!bFirstPerson;Boom->TargetArmLength=bFirstPerson?0:650;
    Boom->SetRelativeLocation(bFirstPerson?FVector(-43,10,42):FVector(0,0,100));
    Boom->bDoCollisionTest=!bFirstPerson;LookYaw=0;LookPitch=bFirstPerson?0:-12;
}
FString AAWAuroraVehicle::Status() const
{
    return FString::Printf(TEXT("%s  |  %s  |  %.0f km/h  |  Battery %.1f / 180 kWh  |  Reserve %.1f%%  |  Gear %s  %s"),
        *ModelName(),bLanding?TEXT("AUTO LAND"):bFlight?TEXT("FLIGHT"):TEXT("ROAD"),SpeedKmh(),Battery,Hydrogen,bGear?TEXT("DOWN"):TEXT("UP"),
        PadAmount>.01f?TEXT("PADS DEPLOYED"):!PanelsClosed()?TEXT("SERVICE INTERLOCK"):TEXT(""));
}
void AAWAuroraVehicle::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    const float DT=FMath::Min(DeltaSeconds,.1f);
    Deployment=FMath::FInterpConstantTo(Deployment,bFlight?1.f:0.f,DT,1.25f);
    GearAmount=FMath::FInterpConstantTo(GearAmount,bGear?1.f:0.f,DT,2);
    const float FlightHalfWidth=VehicleVariant==1?320.f:VehicleVariant==2?260.f:310.f;
    const float MotorReach=FlightHalfWidth-(VehicleVariant?56.f:55.f);
    Collision->SetBoxExtent(FVector(FMath::Lerp(155.f,FlightHalfWidth,Deployment),290,80),false);
    for(int32 I=0;I<4;++I)
    {
        const float Side=I%2?1.f:-1.f,Row=I<2?1.f:-1.f;
        Motors[I]->SetRelativeLocation(FVector(Side*FMath::Lerp(116.f,MotorReach,Deployment),Row*145,70));
        Motors[I]->SetRelativeRotation(FRotator(Side*90*(1-Deployment),0,0));
        Wings[I]->SetRelativeRotation(FRotator(0,Side*Row*90*(1-Deployment),0));
        Wings[I]->SetRelativeScale3D(FVector(Side*FMath::Lerp(.3f,(MotorReach-165)/105.f,Deployment),1,1));
    }
    AnimateMechanics(DT);
    for(UStaticMeshComponent* Rotor:Rotors)Rotor->AddLocalRotation(FRotator(0,(Driver.IsValid()?1800:90)*DT,0));
    if(!Driver.IsValid())return;
    const bool Powered=Battery>0||Hydrogen>0;
    const float AirMax=VehicleVariant?17222.2f:8888.9f, RoadMax=VehicleVariant?8888.9f:6944.4f;
    const bool Interlocked=bParkingPads||PadAmount>.01f||!PanelsClosed();
    const float Target=bLanding||!Powered||Interlocked?0:Throttle*(Throttle<0?500:bFlight?AirMax*(bBoost?1.f:.8125f):RoadMax*(bBoost?1.f:.8f));
    const float Acceleration=bFlight?(VehicleVariant==1?992.f:VehicleVariant==2?677.5f:479.f):(VehicleVariant==2?992.f:868.f);
    Speed=FMath::FInterpConstantTo(Speed,Target,DT,Throttle==0||bLanding?1600:Acceleration);
    AddActorWorldRotation(FRotator(0,Steering*(bFlight?45:55)*DT*FMath::Clamp(FMath::Abs(Speed)/500,.15f,1.f),0));
    FHitResult Floor;
    const bool HasFloor=FindGround(Floor);
    const float FloorZ=HasFloor?Floor.Location.Z:0;
    if(bLanding&&GetActorLocation().Z-FloorZ<105){bFlight=false;bLanding=false;}
    const float DesiredLift=bFlight&&Deployment>.95f?(bLanding?-300:Powered?LiftInput*500:-300):0;
    LiftVelocity=FMath::FInterpTo(LiftVelocity,DesiredLift,DT,4);
    FVector Delta=GetActorRightVector()*Speed*DT;
    Delta.Z=bFlight?LiftVelocity*DT:FMath::Clamp(FloorZ+90-GetActorLocation().Z,-300*DT,300*DT);
    if(GetActorLocation().Z+Delta.Z<FloorZ+90)Delta.Z=FloorZ+90-GetActorLocation().Z;
    const float Ceiling=VehicleVariant==1?914490.f:VehicleVariant==2?457290.f:600090.f;
    if(GetActorLocation().Z+Delta.Z>Ceiling)Delta.Z=Ceiling-GetActorLocation().Z;
    FHitResult Hit;AddActorWorldOffset(Delta,true,&Hit);
    if(Hit.IsValidBlockingHit()){Speed=0;LiftVelocity=0;}
    const float KW=Driver.IsValid()?(bFlight?280.f:50.f)+FMath::Abs(Throttle)*(bBoost?440:180):0;
    const float GeneratorKW=VehicleVariant==1?50.f:120.f;
    Battery=FMath::Clamp(Battery-(KW-(Hydrogen>0?GeneratorKW:0))*DT/3600,0.f,180.f);
    Hydrogen=FMath::Max(0.f,Hydrogen-FMath::Abs(Speed)*DT/100000.f*(bFlight?100.f/1200:100.f/1000));
    if(Controller)Controller->SetControlRotation(FRotator(LookPitch,GetActorRightVector().Rotation().Yaw+LookYaw,0));
}
