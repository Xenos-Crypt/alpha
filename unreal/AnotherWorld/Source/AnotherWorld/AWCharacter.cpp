#include "AWCharacter.h"
#include "AWAuroraVehicle.h"
#include "AWOrionTransit.h"
#include "EngineUtils.h"
#include "Camera/CameraComponent.h"
#include "Camera/PlayerCameraManager.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/SpotLightComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"

AAWCharacter::AAWCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    GetCapsuleComponent()->InitCapsuleSize(34, 88);
    bUseControllerRotationYaw = true;
    auto* Movement = GetCharacterMovement();
    Movement->MaxWalkSpeed = 300;
    Movement->MaxWalkSpeedCrouched = 150;
    Movement->JumpZVelocity = 380;
    Movement->AirControl = 0.25f;
    Movement->MaxStepHeight = 35;
    Movement->BrakingDecelerationWalking = 1500;
    Movement->GetNavAgentPropertiesRef().bCanCrouch = true;

    BodyCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("BodyCamera"));
    BodyCamera->SetupAttachment(GetCapsuleComponent());
    BodyCamera->SetRelativeLocation(FVector(8, 0, 52));
    BodyCamera->bUsePawnControlRotation = true;
    BodyCamera->SetFieldOfView(95);
    Flashlight = CreateDefaultSubobject<USpotLightComponent>(TEXT("Flashlight"));
    Flashlight->SetupAttachment(BodyCamera);
    Flashlight->SetRelativeLocation(FVector(15, 10, -10));
    Flashlight->SetIntensity(3000);
    Flashlight->SetAttenuationRadius(1800);
    Flashlight->SetInnerConeAngle(18);
    Flashlight->SetOuterConeAngle(35);
    Flashlight->SetCastShadows(false);
    Flashlight->SetVisibility(false);
}

void AAWCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis(TEXT("MoveForward"), this, &AAWCharacter::MoveForward);
    Input->BindAxis(TEXT("MoveRight"), this, &AAWCharacter::MoveRight);
    Input->BindAxis(TEXT("Turn"), this, &APawn::AddControllerYawInput);
    Input->BindAxis(TEXT("LookUp"), this, &AAWCharacter::LookUp);
    Input->BindAction(TEXT("Jump"), IE_Pressed, this, &ACharacter::Jump);
    Input->BindAction(TEXT("Jump"), IE_Released, this, &ACharacter::StopJumping);
    Input->BindAction(TEXT("Sprint"), IE_Pressed, this, &AAWCharacter::SprintPressed);
    Input->BindAction(TEXT("Sprint"), IE_Released, this, &AAWCharacter::SprintReleased);
    Input->BindAction(TEXT("Crouch"), IE_Pressed, this, &AAWCharacter::CrouchPressed);
    Input->BindAction(TEXT("Crouch"), IE_Released, this, &AAWCharacter::CrouchReleased);
    Input->BindAction(TEXT("Flashlight"), IE_Pressed, this, &AAWCharacter::ToggleFlashlight);
    Input->BindAction(TEXT("UseVehicle"), IE_Pressed, this, &AAWCharacter::UseVehicle);
    Input->BindAction(TEXT("OrionLift"), IE_Pressed, this, &AAWCharacter::UseTransitLift);
}

void AAWCharacter::MoveForward(float Value)
{
    if (Controller) AddMovementInput(FRotationMatrix(FRotator(0, Controller->GetControlRotation().Yaw, 0)).GetUnitAxis(EAxis::X), Value);
}
void AAWCharacter::MoveRight(float Value)
{
    if (Controller) AddMovementInput(FRotationMatrix(FRotator(0, Controller->GetControlRotation().Yaw, 0)).GetUnitAxis(EAxis::Y), Value);
}
void AAWCharacter::LookUp(float Value) { AddControllerPitchInput(Value); }
void AAWCharacter::SetSprinting(bool bEnabled)
{
    bSprinting = bEnabled;
    GetCharacterMovement()->MaxWalkSpeed = bEnabled ? 550 : 300;
}
void AAWCharacter::SprintPressed() { SetSprinting(true); }
void AAWCharacter::SprintReleased() { SetSprinting(false); }
void AAWCharacter::CrouchPressed() { Crouch(); }
void AAWCharacter::CrouchReleased() { UnCrouch(); }
void AAWCharacter::ToggleFlashlight() { Flashlight->ToggleVisibility(); }
void AAWCharacter::UseVehicle()
{
    for(TActorIterator<AAWOrionLine> Line(GetWorld());Line;++Line)
        if(Line->GetRider()==this){Line->Alight();return;}
    AAWAuroraVehicle* Nearest=nullptr;float Distance=600;
    for(TActorIterator<AAWAuroraVehicle> Vehicle(GetWorld());Vehicle;++Vehicle)
    {
        const float Candidate=FVector::Dist(GetActorLocation(),Vehicle->GetActorLocation());
        if(!Vehicle->IsOccupied()&&Candidate<Distance){Distance=Candidate;Nearest=*Vehicle;}
    }
    if(Nearest){Nearest->EnterDriver(this);return;}
    for(TActorIterator<AAWOrionLine> Line(GetWorld());Line;++Line)if(Line->Board(this))return;
}
void AAWCharacter::UseTransitLift()
{
    AAWTransitLift* Nearest=nullptr;float Distance=350;
    for(TActorIterator<AAWTransitLift> Lift(GetWorld());Lift;++Lift)
    {
        const float Candidate=FVector::Dist(GetActorLocation(),Lift->GetActorLocation());
        if(Candidate<Distance){Nearest=*Lift;Distance=Candidate;}
    }
    if(Nearest)Nearest->Travel(this);
}

void AAWCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    const auto* Movement = GetCharacterMovement();
    const float Speed = GetVelocity().Size2D();
    const bool bWalking = Movement->IsMovingOnGround() && Speed > 10;
    StepPhase += DeltaSeconds * (bSprinting ? 12 : 9);
    const float Bob = bWalking ? FMath::Sin(StepPhase) * FMath::Min(Speed / 550, 1.f) * 0.8f : 0;
    const FVector Target(8, 0, 52 + Bob);
    BodyCamera->SetRelativeLocation(FMath::VInterpTo(BodyCamera->GetRelativeLocation(), Target, DeltaSeconds, 12));
    BodyCamera->SetFieldOfView(FMath::FInterpTo(BodyCamera->FieldOfView, bSprinting && bWalking ? 99.f : 95.f, DeltaSeconds, 5));
    if (auto* Player = Cast<APlayerController>(Controller))
    {
        Player->PlayerCameraManager->ViewPitchMin = -80;
        Player->PlayerCameraManager->ViewPitchMax = 80;
    }
}
