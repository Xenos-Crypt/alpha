#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "AWCharacter.h"
#include "AWAuroraVehicle.h"
#include "AWOrionTransit.h"
#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Engine/StaticMesh.h"
#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/CapsuleComponent.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "Engine/GameViewportClient.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "UnrealClient.h"

// Run in the actual walking map, rather than a synthetic test floor.
class FAWWalkingCheck : public IAutomationLatentCommand
{
public:
    explicit FAWWalkingCheck(FAutomationTestBase* InTest) : Test(InTest) {}
    virtual bool Update() override
    {
        UWorld* World = nullptr;
        for (const auto& Context : GEngine->GetWorldContexts())
            if (Context.World() && Context.World()->IsGameWorld()) { World = Context.World(); break; }
        if (!World) { Test->AddError(TEXT("Launch the test with -game in HidrokPlayable")); return true; }
        auto* Controller = World->GetFirstPlayerController();
        auto* Player = Controller ? Cast<AAWCharacter>(Controller->GetPawn()) : nullptr;
        if (!Player) { Test->AddError(TEXT("Walking game mode did not spawn AAWCharacter")); return true; }
        if (Phase == 0)
        {
            Started = World->GetTimeSeconds(); Phase = 1;
            Controller->SetControlRotation(FRotator(0, 90, 0));
        }
        const float Elapsed = World->GetTimeSeconds() - Started;
        if (Phase == 1 && Elapsed > 1)
        {
            Test->AddInfo(FString::Printf(TEXT("Spawn position=%s velocity=%s mode=%d capsule=%d pawnResponse=%d"),
                *Player->GetActorLocation().ToString(), *Player->GetVelocity().ToString(),
                int32(Player->GetCharacterMovement()->MovementMode), int32(Player->GetCapsuleComponent()->GetCollisionEnabled()),
                int32(Player->GetCapsuleComponent()->GetCollisionResponseToChannel(ECC_WorldStatic))));
            FHitResult GroundHit;
            FCollisionQueryParams Query;
            Query.AddIgnoredActor(Player);
            const bool bFloor = World->LineTraceSingleByChannel(GroundHit,
                FVector(160, 4400, 500), FVector(160, 4400, -100), ECC_Pawn, Query);
            Test->AddInfo(FString::Printf(TEXT("Spawn floor trace=%d actor=%s at=%s"), bFloor,
                *GetNameSafe(GroundHit.GetActor()), *GroundHit.Location.ToString()));
            Test->TestTrue(TEXT("Spawn settles on the real street"), Player->GetCharacterMovement()->IsMovingOnGround());
            int32 BuildingBlockers = 0;
            for (TActorIterator<AActor> Actor(World); Actor; ++Actor)
            {
                if (!Actor->ActorHasTag(TEXT("AWBuildingBlocker"))) continue;
                ++BuildingBlockers;
                FVector Center, Extent;
                Actor->GetActorBounds(true, Center, Extent);
                FHitResult Hit;
                const bool bBlocked = World->LineTraceSingleByChannel(Hit,
                    Center - FVector(Extent.X + 200, 0, 0), Center, ECC_Visibility);
                Test->TestTrue(TEXT("Building footprint blocks street entry"), bBlocked);
            }
            Test->TestEqual(TEXT("Every source building has traversal collision"), BuildingBlockers, 177);
            Origin = Player->GetActorLocation(); Started = World->GetTimeSeconds(); Phase = 2;
        }
        else if (Phase == 2)
        {
            Player->AddMovementInput(FVector::RightVector);
            if (Elapsed > 2)
            {
                WalkDistance = FVector::Dist2D(Origin, Player->GetActorLocation());
                Test->TestTrue(TEXT("Can walk at least three metres along the street"), WalkDistance > 300);
                Origin = Player->GetActorLocation(); Player->SetSprinting(true);
                Started = World->GetTimeSeconds(); Phase = 3;
            }
        }
        else if (Phase == 3)
        {
            Player->AddMovementInput(FVector::RightVector);
            if (Elapsed > 2)
            {
                Test->TestTrue(TEXT("Sprint covers more ground than walking"),
                    FVector::Dist2D(Origin, Player->GetActorLocation()) > WalkDistance * 1.3f);
                Player->SetSprinting(false); Origin = Player->GetActorLocation();
                Player->Jump(); Started = World->GetTimeSeconds(); Phase = 4;
            }
        }
        else if (Phase == 4)
        {
            Peak = FMath::Max(Peak, Player->GetActorLocation().Z - Origin.Z);
            if (Elapsed > 2)
            {
                Player->StopJumping();
                Test->TestTrue(TEXT("Jump leaves the street"), Peak > 20);
                Test->TestTrue(TEXT("Lands without falling through the street"), Player->GetCharacterMovement()->IsMovingOnGround());
                FScreenshotRequest::RequestScreenshot(World->GetMapName() + TEXT(".png"), true, false);
                Started = World->GetTimeSeconds(); Phase = 5;
            }
        }
        else if (Phase == 5 && Elapsed > 2) return true;
        return false;
    }
private:
    FAutomationTestBase* Test;
    int32 Phase = 0;
    float Started = 0, WalkDistance = 0, Peak = 0;
    FVector Origin;
};

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FAWStreetWalkingTest, "AnotherWorld.Gameplay.StreetWalking",
    EAutomationTestFlags::ClientContext | EAutomationTestFlags::EngineFilter)
bool FAWStreetWalkingTest::RunTest(const FString& Parameters)
{
    ADD_LATENT_AUTOMATION_COMMAND(FAWWalkingCheck(this));
    return true;
}
class FAWVehicleCheck : public IAutomationLatentCommand
{
public:
    explicit FAWVehicleCheck(FAutomationTestBase* InTest,int32 Variant=0):Test(InTest),RequestedVariant(Variant){}
    virtual bool Update() override
    {
        UWorld* World=nullptr;
        for(const auto& Context:GEngine->GetWorldContexts())
            if(Context.World()&&Context.World()->IsGameWorld()){World=Context.World();break;}
        if(!World){Test->AddError(TEXT("No game world"));return true;}
        auto* PC=World->GetFirstPlayerController();
        if(!PC)return false;
        if(Phase==0)
        {
            for(TActorIterator<AAWAuroraVehicle> It(World);It;++It)
                if(It->GetVehicleVariant()==RequestedVariant){Car=*It;break;}
            Character=Cast<AAWCharacter>(PC->GetPawn());
            if(!Car||!Character){Test->AddError(TEXT("HidrokFuture needs an Aurora and walking player"));return true;}
            Test->AddInfo(TEXT("Checking ")+Car->ModelName());
            Original=Car->GetActorLocation(); PlayerOrigin=Character->GetActorLocation();
            OriginalRotation=Car->GetActorRotation();
            const FVector Forward=Car->GetActorRightVector();
            ViewRight=FVector::CrossProduct(FVector::UpVector,Forward).GetSafeNormal();
            Character->SetActorLocation(Original+FVector(240,0,10),false);
            if(!Test->TestTrue(TEXT("Enter nearby Aurora"),Car->EnterDriver(Character)))return true;
            Test->TestTrue(TEXT("Controller possesses car"),PC->GetPawn()==Car);
            Car->SetDriveInput(0,1,0); Started=World->GetTimeSeconds();Phase=6;
        }
        const float Elapsed=World->GetTimeSeconds()-Started;
        if(Elapsed>20){Test->AddError(FString::Printf(TEXT("Vehicle phase %d timed out: %s"),Phase,*Car->Diagnostics()));Car->ClearDriveInput();return true;}
        if(Phase==6&&Elapsed>1)
        {
            Test->TestTrue(TEXT("D steers toward camera-right"),FVector::DotProduct(Car->GetActorRightVector(),ViewRight)>.05f);
            Car->SetActorRotation(OriginalRotation);
            Car->SetDriveInput(0,-1,0);Started=World->GetTimeSeconds();Phase=7;
        }
        else if(Phase==7&&Elapsed>1)
        {
            Test->TestTrue(TEXT("A steers toward camera-left"),FVector::DotProduct(Car->GetActorRightVector(),ViewRight)<-.05f);
            Car->SetActorRotation(OriginalRotation);
            Car->SetDriveInput(.25f,0,0);Started=World->GetTimeSeconds();Phase=1;
        }
        else if(Phase==1&&Elapsed>1.5f)
        {
            Test->TestTrue(TEXT("Road propulsion moves car"),FVector::Dist2D(Original,Car->GetActorLocation())>200);
            Car->SetDriveInput(0,0,0);Started=World->GetTimeSeconds();Phase=2;
        }
        else if(Phase==2&&Elapsed>1.5f)
        {
            FScreenshotRequest::RequestScreenshot(CaptureName()+TEXT("_Road.png"),true,false);
            Test->TestTrue(TEXT("Full-size wheels contact the street"),Car->WheelContactErrorCm()<2);
            Car->ToggleParkingPads();Car->ToggleBoot();Car->ToggleBonnet();Car->ToggleDoors();
            ParkOrigin=Car->GetActorLocation();Car->SetDriveInput(.5f,0,0);
            Started=World->GetTimeSeconds();Phase=8;
        }
        else if(Phase==8&&Elapsed>2.5f)
        {
            Test->TestTrue(TEXT("Parking pads fully deploy"),Car->ParkingPadDeployment()>.99f);
            Test->TestTrue(TEXT("Boot releases and opens"),Car->BootOpening()>60&&!Car->BootLocked());
            Test->TestTrue(TEXT("Parking/service interlock prevents driving"),FVector::Dist2D(ParkOrigin,Car->GetActorLocation())<5);
            Car->ToggleFlight();Test->TestFalse(TEXT("Cannot take off with service panels and pads deployed"),Car->IsAirMode());
            Car->ToggleDiagnostics();
            ReviewCamera=World->SpawnActor<ACameraActor>();
            const FVector ReviewPosition=Car->GetActorLocation()+Car->GetActorForwardVector()*600-Car->GetActorRightVector()*450+FVector(0,0,130);
            ReviewCamera->SetActorLocation(ReviewPosition);
            ReviewCamera->SetActorRotation((Car->GetActorLocation()+FVector(0,0,10)-ReviewPosition).Rotation());
            ReviewCamera->GetCameraComponent()->SetFieldOfView(65);
            PC->SetViewTarget(ReviewCamera);
            FScreenshotRequest::RequestScreenshot(CaptureName()+TEXT("_ParkedService.png"),true,false);
            Started=World->GetTimeSeconds();Phase=12;
        }
        else if(Phase==12&&Elapsed>.5f)
        {
            PC->SetViewTarget(Car);
            if(ReviewCamera){ReviewCamera->Destroy();ReviewCamera=nullptr;}
            TInlineComponentArray<UStaticMeshComponent*> VehicleMeshes;
            Car->GetComponents(VehicleMeshes);
            for(auto* Mesh:VehicleMeshes)
                if(Mesh->GetName()==TEXT("LuggageBoot"))
                {
                    auto* Lid=Cast<UStaticMeshComponent>(Mesh);Lid->UpdateBounds();
                    Obstruction=World->SpawnActor<AActor>();
                    auto* Box=NewObject<UBoxComponent>(Obstruction);Obstruction->SetRootComponent(Box);
                    Box->SetBoxExtent(FVector(15));Box->SetCollisionProfileName(TEXT("BlockAll"));Box->RegisterComponent();
                    Obstruction->SetActorLocation(Lid->GetComponentTransform().TransformPosition(Lid->GetStaticMesh()->GetBounds().Origin));break;
                }
            Test->TestNotNull(TEXT("Closing sensor obstruction created"),Obstruction);
            Car->SetDriveInput(0,0,0);Car->ToggleBoot();Started=World->GetTimeSeconds();Phase=9;
        }
        else if(Phase==9&&Elapsed>.5f)
        {
            Test->TestTrue(TEXT("Obstructed boot reopens without locking"),Car->BootObstructed()&&!Car->BootLocked());
            FScreenshotRequest::RequestScreenshot(CaptureName()+TEXT("_BootObstruction.png"),true,false);
            if(Obstruction){Obstruction->Destroy();Obstruction=nullptr;}
            Car->ToggleBonnet();Car->ToggleDoors();Car->ToggleParkingPads();
            Started=World->GetTimeSeconds();Phase=11;
        }
        else if(Phase==11&&Elapsed>.5f)
        {
            Car->ToggleBoot();Started=World->GetTimeSeconds();Phase=10;
        }
        else if(Phase==10&&Elapsed>2.5f&&Car->BootLocked()&&Car->ParkingPadDeployment()<.01f)
        {
            Test->TestTrue(TEXT("Closed boot latches and locks"),Car->BootOpening()<.1f&&Car->BootLocked());
            Test->TestTrue(TEXT("Parking pads retract"),Car->ParkingPadDeployment()<.01f);
            Car->ToggleDiagnostics();
            Car->ToggleFlight();Car->SetDriveInput(0,0,1);Started=World->GetTimeSeconds();Phase=3;
        }
        else if(Phase==3&&Elapsed>3)
        {
            Test->TestTrue(TEXT("Wings deploy"),Car->FlightDeployment()>.95f);
            Test->TestTrue(TEXT("Vertical takeoff clears road"),Car->GroundDistance()>500);
            Test->TestTrue(TEXT("Flight consumes battery"),Car->BatteryKWh()<180);
            Test->TestFalse(TEXT("Cannot leave car in flight"),Car->LeaveDriver());
            Car->SetDriveInput(0,0,0);
            FScreenshotRequest::RequestScreenshot(CaptureName()+TEXT("_Flight.png"),true,false);
            Started=World->GetTimeSeconds();Phase=4;
        }
        else if(Phase==4&&Elapsed>2)
        {
            Car->ToggleFlight();Started=World->GetTimeSeconds();Phase=5;
        }
        else if(Phase==5&&!Car->IsAirMode()&&Car->FlightDeployment()<.05f)
        {
            Test->TestTrue(TEXT("Autoland returns to road"),Car->GroundDistance()<110);
            Test->TestTrue(TEXT("Exit after landing and folding"),Car->LeaveDriver());
            Test->TestTrue(TEXT("Controller returns to walking"),PC->GetPawn()==Character);
            Car->SetActorLocation(Original,false);Car->SetActorRotation(OriginalRotation);
            Character->SetActorLocation(PlayerOrigin,false);
            return true;
        }
        return false;
    }
private:
    FAutomationTestBase* Test;
    AAWAuroraVehicle* Car=nullptr;
    AAWCharacter* Character=nullptr;
    FVector Original,PlayerOrigin;
    FVector ParkOrigin;
    AActor* Obstruction=nullptr;
    ACameraActor* ReviewCamera=nullptr;
    FVector ViewRight;
    FRotator OriginalRotation;
    int32 RequestedVariant=0;
    FString CaptureName() const { return RequestedVariant==1?TEXT("SkylineX7"):RequestedVariant==2?TEXT("AerodynexX12"):TEXT("AuroraX9"); }
    int32 Phase=0;
    float Started=0;
};
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FAWVehicleFlightTest,"AnotherWorld.Gameplay.VehicleFlight",
    EAutomationTestFlags::ClientContext|EAutomationTestFlags::EngineFilter)
bool FAWVehicleFlightTest::RunTest(const FString& Parameters)
{
    ADD_LATENT_AUTOMATION_COMMAND(FAWVehicleCheck(this));
    ADD_LATENT_AUTOMATION_COMMAND(FAWVehicleCheck(this,1));
    ADD_LATENT_AUTOMATION_COMMAND(FAWVehicleCheck(this,2));
    return true;
}
class FAWOrionCheck : public IAutomationLatentCommand
{
public:
    explicit FAWOrionCheck(FAutomationTestBase* InTest):Test(InTest){}
    virtual bool Update() override
    {
        UWorld* World=nullptr;
        for(const auto& Context:GEngine->GetWorldContexts())if(Context.World()&&Context.World()->IsGameWorld()){World=Context.World();break;}
        if(!World){Test->AddError(TEXT("Orion needs a game world"));return true;}
        auto* PC=World->GetFirstPlayerController();if(!PC)return false;
        if(Phase==0)
        {
            Player=Cast<AAWCharacter>(PC->GetPawn());
            for(TActorIterator<AAWOrionLine> It(World);It;++It){if(It->IsTram())Tram=*It;else Regional=*It;}
            for(TActorIterator<AAWTransitLift> It(World);It;++It)
            {
                if(It->GetActorLocation().Z>0&&It->GetActorLocation().Z<200){if(It->bTramAccess)TramStreet=*It;else RailStreet=*It;}
                else {if(It->bTramAccess)TramReturn=*It;else RailReturn=*It;}
            }
            if(!Player||!Tram||!Regional||!TramStreet||!RailStreet||!TramReturn||!RailReturn){Test->AddError(TEXT("Orion services or lift landings missing"));return true;}
            Original=Player->GetActorLocation();OriginalRotation=PC->GetControlRotation();
            Test->TestTrue(TEXT("Regional train is underground"),Regional->TrainLocation().Z<-1000);
            Test->TestTrue(TEXT("Tram remains elevated"),Tram->TrainLocation().Z>500);
            Player->SetActorLocation(RailStreet->GetActorLocation()+FVector(-120,0,0),false);
            Test->TestTrue(TEXT("Street lift reaches underground platform"),RailStreet->Travel(Player));
            Started=World->GetTimeSeconds();Phase=1;
        }
        const float Elapsed=World->GetTimeSeconds()-Started;
        if(Elapsed>30){Test->AddError(FString::Printf(TEXT("Orion phase %d timed out"),Phase));Cleanup(PC);return true;}
        if(Phase==1&&Elapsed>1)
        {
            Test->TestTrue(TEXT("Underground platform has walking collision"),Player->GetCharacterMovement()->IsMovingOnGround()&&Player->GetActorLocation().Z<-1000);
            Regional->ResetAtCentralStation();FScreenshotRequest::RequestScreenshot(TEXT("Orion_UndergroundStation.png"),true,false);
            Started=World->GetTimeSeconds();Phase=2;
        }
        else if(Phase==2&&Elapsed>.5f)
        {
            if(!Test->TestTrue(TEXT("Can board stopped underground train"),Regional->Board(Player))){Cleanup(PC);return true;}
            Origin=Regional->TrainLocation();FScreenshotRequest::RequestScreenshot(TEXT("Orion_RegionalRide.png"),true,false);
            Started=World->GetTimeSeconds();Phase=3;
        }
        else if(Phase==3&&Elapsed>10&&Regional->SpeedCm()>120)
        {
            Test->TestTrue(TEXT("Regional train moves along the tunnel"),FVector::Dist(Origin,Regional->TrainLocation())>100);
            Test->TestTrue(TEXT("Passenger moves with the train"),Player->GetAttachParentActor()==Regional);
            Test->TestTrue(TEXT("Regional remains on guideway"),Regional->GuidewayErrorCm()<.1f);
            Test->TestFalse(TEXT("Cannot alight from a moving train"),Regional->Alight());
            Test->TestFalse(TEXT("Doors lock before train moves"),Regional->DoorsAreOpen());
            Regional->EmergencyStop();Started=World->GetTimeSeconds();Phase=4;
        }
        else if(Phase==4&&Regional->SpeedCm()<1)
        {
            Test->AddInfo(TEXT("Regional emergency braking stopped the consist"));
            Regional->ResetAtCentralStation();Test->TestTrue(TEXT("Alight at underground Central"),Regional->Alight());
            Test->TestTrue(TEXT("Underground lift returns to street"),RailReturn->Travel(Player));
            Player->SetActorLocation(TramStreet->GetActorLocation()+FVector(-120,0,0),false);
            Test->TestTrue(TEXT("Street lift reaches elevated tram platform"),TramStreet->Travel(Player));
            Started=World->GetTimeSeconds();Phase=5;
        }
        else if(Phase==5&&Elapsed>1)
        {
            Test->TestTrue(TEXT("Elevated platform has walking collision"),Player->GetCharacterMovement()->IsMovingOnGround()&&Player->GetActorLocation().Z>500);
            Tram->ResetAtCentralStation();FScreenshotRequest::RequestScreenshot(TEXT("Orion_ElevatedPlatform.png"),true,false);
            Started=World->GetTimeSeconds();Phase=6;
        }
        else if(Phase==6&&Elapsed>.5f)
        {
            if(!Test->TestTrue(TEXT("Can board stopped elevated tram"),Tram->Board(Player))){Cleanup(PC);return true;}
            Origin=Tram->TrainLocation();FScreenshotRequest::RequestScreenshot(TEXT("Orion_TramRide.png"),true,false);
            Started=World->GetTimeSeconds();Phase=7;
        }
        else if(Phase==7&&Elapsed>10&&Tram->SpeedCm()>120)
        {
            Test->TestTrue(TEXT("Tram moves above the street"),FVector::Dist(Origin,Tram->TrainLocation())>100&&Tram->TrainLocation().Z>500);
            Test->TestTrue(TEXT("Tram stays on elevated guideway"),Tram->GuidewayErrorCm()<.1f);
            Test->TestFalse(TEXT("Cannot alight from moving tram"),Tram->Alight());
            Tram->EmergencyStop();Started=World->GetTimeSeconds();Phase=8;
        }
        else if(Phase==8&&Tram->SpeedCm()<1)
        {
            Tram->ResetAtCentralStation();Test->TestTrue(TEXT("Alight at elevated Central"),Tram->Alight());
            Test->TestTrue(TEXT("Tram platform lift returns to street"),TramReturn->Travel(Player));
            Cleanup(PC);return true;
        }
        return false;
    }
private:
    void Cleanup(APlayerController* PC)
    {
        for(auto* Line:{Regional,Tram})if(Line&&Line->GetRider()==Player){Line->ResetAtCentralStation();Line->Alight();}
        if(Player){Player->SetActorLocation(Original,false);PC->SetControlRotation(OriginalRotation);}
    }
    FAutomationTestBase* Test;
    AAWCharacter* Player=nullptr;
    AAWOrionLine* Regional=nullptr;AAWOrionLine* Tram=nullptr;
    AAWTransitLift *RailStreet=nullptr,*RailReturn=nullptr,*TramStreet=nullptr,*TramReturn=nullptr;
    FVector Original,Origin;FRotator OriginalRotation;
    float Started=0;int32 Phase=0;
};
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FAWOrionTransitTest,"AnotherWorld.Gameplay.OrionTransit",EAutomationTestFlags::ClientContext|EAutomationTestFlags::EngineFilter)
bool FAWOrionTransitTest::RunTest(const FString& Parameters)
{
    ADD_LATENT_AUTOMATION_COMMAND(FAWOrionCheck(this));return true;
}
#endif
