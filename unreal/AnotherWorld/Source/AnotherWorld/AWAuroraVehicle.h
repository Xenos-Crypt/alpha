#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "AWAuroraVehicle.generated.h"

class AAWCharacter;
class UBoxComponent;
class UCameraComponent;
class USpringArmComponent;
class UStaticMeshComponent;

UCLASS()
class ANOTHERWORLD_API AAWAuroraVehicle : public APawn
{
    GENERATED_BODY()
public:
    AAWAuroraVehicle();
    virtual void OnConstruction(const FTransform& Transform) override;
    virtual void BeginPlay() override;
    UFUNCTION(BlueprintCallable) void SetVehicleVariant(int32 Variant);
    int32 GetVehicleVariant() const { return VehicleVariant; }
    FString ModelName() const;
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
    bool EnterDriver(AAWCharacter* Character);
    bool LeaveDriver();
    void ToggleFlight();
    void SetDriveInput(float Forward, float Turn, float Lift);
    void ClearDriveInput() { bScriptInput=false; Throttle=Steering=LiftInput=0; }
    float SpeedKmh() const { return FMath::Abs(Speed) * .036f; }
    float FlightDeployment() const { return Deployment; }
    float BatteryKWh() const { return Battery; }
    bool IsAirMode() const { return bFlight || bLanding; }
    bool IsOccupied() const { return Driver.IsValid(); }
    float GroundDistance() const;
    FString Status() const;
    void ToggleParkingPads();
    void ToggleBoot();
    void ToggleBonnet();
    void ToggleDoors();
    void ToggleDiagnostics() { bDiagnostics=!bDiagnostics; }
    bool DiagnosticsVisible() const { return bDiagnostics; }
    FString Diagnostics() const;
    float ParkingPadDeployment() const { return PadAmount; }
    float BootOpening() const { return BootAngle; }
    bool BootLocked() const { return bBootLocked; }
    bool BootObstructed() const { return bBootObstructed; }
    float WheelContactErrorCm() const;
private:
    UPROPERTY(EditAnywhere, Category="Vehicle", meta=(ClampMin="0",ClampMax="2")) int32 VehicleVariant=0;
    UPROPERTY() TObjectPtr<UStaticMeshComponent> Body;
    UPROPERTY() TObjectPtr<UBoxComponent> Collision;
    UPROPERTY() TObjectPtr<USceneComponent> VisualRoot;
    UPROPERTY() TObjectPtr<UCameraComponent> Camera;
    UPROPERTY() TObjectPtr<USpringArmComponent> Boom;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Motors;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Rotors;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Wings;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Gear;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Tyres;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> ParkingPads;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> BootStruts;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Doors;
    UPROPERTY() TObjectPtr<UStaticMeshComponent> BootLid;
    UPROPERTY() TObjectPtr<UStaticMeshComponent> Bonnet;
    TWeakObjectPtr<AAWCharacter> Driver;
    float Throttle=0, Steering=0, LiftInput=0, Speed=0, LiftVelocity=0;
    float Deployment=0, GearAmount=1, Battery=180, Hydrogen=100;
    float LookYaw=0, LookPitch=-12;
    bool bFlight=false, bLanding=false, bBoost=false, bFirstPerson=false, bGear=true;
    bool bScriptInput=false;
    bool bParkingPads=false,bBootOpen=false,bBonnetOpen=false,bDoorsOpen=false,bDiagnostics=false;
    bool bBootLocked=true,bBootLatched=true,bBootObstructed=false;
    float PadAmount=0,BootAngle=0,BonnetAngle=0,DoorAngle=0,BootRelease=0,WheelRoll=0;
    float Suspension[4]={0,0,0,0};
    void ForwardInput(float Value);
    void TurnInput(float Value);
    void Lift(float Value);
    void Look(float Value);
    void LookUp(float Value);
    void BoostOn();
    void BoostOff();
    void ToggleGear();
    void ToggleCamera();
    void ExitPressed();
    bool FindGround(FHitResult& Hit) const;
    void ApplyVariant();
    bool CanService() const;
    bool PanelsClosed() const;
    void AnimateMechanics(float DT);
};
